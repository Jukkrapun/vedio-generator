"""POC: 2.5D parallax from a single still (depth map + depth-weighted camera move).

Usage (from content/poc/parallax):
    .venv\\Scripts\\python.exe parallax.py src/bedroom.png --pan 0.03 0 --zoom 0.08
Outputs in output/poc/parallax/ (repo root): <name>-depth.png, <name>-parallax.mp4, <name>-zoom.mp4, <name>-compare.mp4
"""
import argparse
import glob
import os
import shutil
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

W, H, FPS = 1080, 1920, 30
HERE = Path(__file__).parent


def ffmpeg_bin() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    pat = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-*\bin\ffmpeg.exe")
    hits = glob.glob(pat)
    if not hits:
        raise SystemExit("ffmpeg not found")
    return hits[0]


def estimate_depth(img: Image.Image, cache: Path) -> np.ndarray:
    """Relative depth 0..1, 1 = near. Cached as PNG."""
    if cache.exists():
        return np.asarray(Image.open(cache), dtype=np.float32) / 65535.0
    from transformers import pipeline
    pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
    d = np.asarray(pipe(img)["predicted_depth"].squeeze(), dtype=np.float32)
    d = cv2.resize(d, img.size, interpolation=cv2.INTER_CUBIC)
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    Image.fromarray((d * 65535).astype(np.uint16)).save(cache)
    return d


def cover(img: np.ndarray, w: int, h: int, margin: float) -> np.ndarray:
    """Resize to cover w x h plus a margin so the moving camera never shows edges."""
    tw, th = int(w * (1 + margin)), int(h * (1 + margin))
    s = max(tw / img.shape[1], th / img.shape[0])
    img = cv2.resize(img, (round(img.shape[1] * s), round(img.shape[0] * s)), interpolation=cv2.INTER_LANCZOS4)
    y, x = (img.shape[0] - th) // 2, (img.shape[1] - tw) // 2
    return img[y:y + th, x:x + tw]


def ease(t: float) -> float:
    return 0.5 - 0.5 * np.cos(np.pi * t)


def render(frames_fn, out: Path, seconds: float):
    n = int(seconds * FPS)
    p = subprocess.Popen([ffmpeg_bin(), "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                          "-crf", "18", "-preset", "medium", str(out)], stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(frames_fn(ease(i / (n - 1))).tobytes())
    p.stdin.close()
    p.wait()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--seconds", type=float, default=6)
    ap.add_argument("--pan", type=float, nargs=2, default=[0.03, 0.0], help="camera move x y (fraction of width)")
    ap.add_argument("--zoom", type=float, default=0.08, help="dolly-in amount for the nearest layer")
    ap.add_argument("--focus", type=float, default=0.0, help="depth that stays still (0 = far, 0.5 = mid)")
    a = ap.parse_args()

    src = Path(a.image)
    out = HERE.parents[2] / "output" / "poc" / "parallax"
    out.mkdir(parents=True, exist_ok=True)
    name = src.stem
    pil = Image.open(src).convert("RGB")
    depth = estimate_depth(pil, out / f"{name}-depth16.png")
    Image.fromarray((depth * 255).astype(np.uint8)).save(out / f"{name}-depth.png")

    margin = 0.18
    img = cover(cv2.cvtColor(np.asarray(pil), cv2.COLOR_RGB2BGR), W, H, margin)
    d = cover(depth, W, H, margin)
    # Soften + grow near objects a bit so edges stretch smoothly instead of tearing.
    d = cv2.dilate(d, np.ones((9, 9), np.uint8))
    d = cv2.GaussianBlur(d, (0, 0), 6)
    d = d - a.focus  # layer at `focus` does not move; nearer moves forward, farther moves back

    ih, iw = img.shape[:2]
    cx, cy = iw / 2, ih / 2
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    ox, oy = (iw - W) / 2, (ih - H) / 2
    gx, gy = xs + ox, ys + oy  # output pixel in source coords (static camera)
    dd = d[int(oy):int(oy) + H, int(ox):int(ox) + W]  # depth sampled at output position (approximation)

    def parallax(t):
        scale = 1 + a.zoom * t * (0.35 + dd)          # near layers grow more
        shift_x = a.pan[0] * W * t * (dd - 0.5)        # near/far move opposite ways around mid
        shift_y = a.pan[1] * W * t * (dd - 0.5)
        mx = cx + (gx - cx) / scale - shift_x
        my = cy + (gy - cy) / scale - shift_y
        return cv2.remap(img, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_REFLECT)

    def zoom(t):  # what the pipeline does today: uniform Ken Burns
        s = 1 + a.zoom * 0.6 * t
        m = np.float32([[s, 0, W / 2 - s * cx], [0, s, H / 2 - s * cy]])
        return cv2.warpAffine(img, m, (W, H), flags=cv2.INTER_LINEAR)

    render(parallax, out / f"{name}-parallax.mp4", a.seconds)
    render(zoom, out / f"{name}-zoom.mp4", a.seconds)

    # Side by side: left = today's zoom, right = parallax.
    subprocess.run([ffmpeg_bin(), "-y", "-loglevel", "error", "-i", str(out / f"{name}-zoom.mp4"),
                    "-i", str(out / f"{name}-parallax.mp4"), "-filter_complex",
                    "[0]scale=540:960,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='zoom (now)':x=20:y=20:fontsize=36:fontcolor=white:borderw=3[a];"
                    "[1]scale=540:960,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='parallax':x=20:y=20:fontsize=36:fontcolor=white:borderw=3[b];"
                    "[a][b]hstack", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
                    str(out / f"{name}-compare.mp4")], check=True)
    print("done:", out / f"{name}-compare.mp4")


if __name__ == "__main__":
    main()
