"""2.5D parallax for still images: depth map (Depth Anything V2 Small, CPU) + depth-weighted camera move.

Depth maps are cached as 8-bit PNGs in `<image dir>/.depth/<stem>.png` (committed with the images, so
rendering only needs numpy + opencv; torch/transformers are only needed to make missing depth maps).
A depth map older than its image is rebuilt.

Usage:
    python tools/parallax.py <episode>          # make missing depth maps for the episode's images
POC + side-by-side comparisons: content/poc/parallax/.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

MODEL = "depth-anything/Depth-Anything-V2-Small-hf"
MARGIN = 0.18  # extra source area around the frame so the moving camera never shows edges
_pipe = None


def depth_path(image: Path) -> Path:
    return image.parent / ".depth" / f"{image.stem}.png"


def ensure_depth(image: Path) -> Path:
    """Depth map for `image` (1 = near), built if missing or stale."""
    out = depth_path(image)
    if out.exists() and out.stat().st_mtime >= image.stat().st_mtime:
        return out
    global _pipe
    import cv2
    from PIL import Image
    if _pipe is None:
        from transformers import pipeline  # heavy import, only when a depth map is missing
        _pipe = pipeline("depth-estimation", model=MODEL, device="cpu")
    pil = Image.open(image).convert("RGB")
    d = np.asarray(_pipe(pil)["predicted_depth"].squeeze(), dtype=np.float32)
    d = cv2.resize(d, pil.size, interpolation=cv2.INTER_CUBIC)
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    out.parent.mkdir(exist_ok=True)
    Image.fromarray((d * 255).round().astype(np.uint8)).save(out)
    print(f"  depth: {out.relative_to(image.parent.parent)}")
    return out


def _cover(img: np.ndarray, w: int, h: int, interp: int) -> np.ndarray:
    import cv2
    tw, th = int(w * (1 + MARGIN)), int(h * (1 + MARGIN))
    s = max(tw / img.shape[1], th / img.shape[0])
    img = cv2.resize(img, (round(img.shape[1] * s), round(img.shape[0] * s)), interpolation=interp)
    y, x = (img.shape[0] - th) // 2, (img.shape[1] - tw) // 2
    return img[y:y + th, x:x + tw]


def render_parallax(image: Path, duration: float, out: Path, width: int, height: int, fps: int,
                    variant: int = 0, post_vf: str = "", zoom: float = 0.10, pan: float = 0.035) -> None:
    """Write a `duration`-second clip of `image` with a slow depth-aware dolly-in.
    `variant` alternates the sideways drift (even = right, odd = left) between consecutive clips.
    `post_vf` is an extra ffmpeg filter chain (grade, fades) applied while encoding."""
    import cv2
    img = cv2.imread(str(image), cv2.IMREAD_COLOR)
    d = cv2.imread(str(ensure_depth(image)), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
    img = _cover(img, width, height, cv2.INTER_LANCZOS4)
    d = _cover(d, width, height, cv2.INTER_LINEAR)
    # Grow + soften near objects so their edges stretch smoothly instead of tearing.
    d = cv2.GaussianBlur(cv2.dilate(d, np.ones((9, 9), np.uint8)), (0, 0), 6)

    ih, iw = img.shape[:2]
    cx, cy = iw / 2, ih / 2
    ox, oy = (iw - width) // 2, (ih - height) // 2
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    gx, gy = xs + ox, ys + oy
    dd = d[oy:oy + height, ox:ox + width]
    near_scale = 0.35 + dd                      # near layers grow more than far ones
    side = (dd - 0.5) * (pan * width) * (1 if variant % 2 == 0 else -1)

    frames = max(int(round(duration * fps)), 1)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
           "-s", f"{width}x{height}", "-r", str(fps), "-i", "-"]
    if post_vf:
        cmd += ["-vf", post_vf]
    cmd += ["-t", f"{duration:.3f}", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", str(out)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        for i in range(frames):
            t = i / max(frames - 1, 1)
            t = 0.5 - 0.5 * np.cos(np.pi * t)  # ease in/out
            scale = 1 + zoom * t * near_scale
            mx = (cx + (gx - cx) / scale - side * t).astype(np.float32)
            my = (cy + (gy - cy) / scale).astype(np.float32)
            p.stdin.write(cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).tobytes())
    finally:
        p.stdin.close()
        if p.wait() != 0:
            raise RuntimeError(f"ffmpeg failed writing {out}")


def available() -> bool:
    try:
        import cv2  # noqa: F401
        return True
    except ImportError:
        return False


def episode_images(episode_dir: Path) -> list[Path]:
    import json
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    names = dict.fromkeys(s["image"] for s in episode.get("segments", []) if s.get("image"))
    return [episode_dir / n for n in names if (episode_dir / n).exists()]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.path.insert(0, str(Path(__file__).parent))
    import media  # noqa: F401  (ffmpeg on PATH)
    for ep in sys.argv[1:]:
        for img in episode_images(Path(ep).resolve()):
            ensure_depth(img)
