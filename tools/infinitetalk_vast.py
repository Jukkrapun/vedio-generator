"""InfiniteTalk (MeiGen, Apache-2.0) on vast.ai: host look still image + voice -> talking video
(head, eyes, shoulders move, not just the lips). POC 2026-11-22, budget approved: $3.

Usage:
    python tools/infinitetalk_vast.py <episode> [--variants B,A] [--budget 3] [--offers]

Variants (all 480p, fp8-quantised DiT; all run on ONE rented instance, in the order given):
    A  standard: 40 steps                      (best quality, slowest)
    B  TeaCache: 40 steps + --use_teacache     (~2x faster)
  (LoRA speed-ups like lightx2v are NOT possible with the quantised model: InfiniteTalk only applies
   LoRA when quant is None, which needs the full ~93GB weights.)

Writes <episode>/video/host-infinitetalk-<V>.mp4 (raw clip) and renders
output/<series>/<episode>-video-infinitetalk-<V>.mp4 (with subtitles) for side-by-side review.
host.mp4 / the main output are NOT touched.

Flow: rent GPU >=44GB (RTX 4090 48GB / L40S / A6000, ~$0.40-0.50/h) on pytorch 2.4.1 image
-> install InfiniteTalk + deps -> download ~42GB weights from HuggingFace -> per variant: generate
-> download -> destroy instance (always). Stops before a variant if the run would pass the budget.
"""
import argparse
import json
import os
import shlex
import sys
import time
from pathlib import Path

from media import ROOT, host_look
from timing import report, step
from vast import STAGE_FN, find_offers, print_offers, scp, session, ssh

COMMIT = "50aa0a94184315407a991ae804d9b58d6d311ba8"  # MeiGen-AI/InfiniteTalk main, 2026-11-22
# -devel (has nvcc): optimum-quanto JIT-compiles its fp8 Marlin kernel on first use; -runtime has no
# compiler -> "which c++" failed mid-generation (2026-11-22).
IMAGE = "pytorch/pytorch:2.4.1-cuda12.1-cudnn9-devel"  # torch 2.4.1 + cu121 = what InfiniteTalk pins
DISK_GB = 120
# compute_cap 800-999: flash-attn 2/bf16 need Ampere+ (Quadro RTX 8000 = Turing); torch 2.4.1+cu121 stops at
# Hopper (no Blackwell). amd64: GB10 (DGX Spark) is ARM. CMP 170HX = mining card.
QUERY = ("num_gpus=1 geolocation!=CN gpu_ram>=44 compute_cap>=800 compute_cap<1000 cpu_arch=amd64 gpu_name notin [CMP_170HX] reliability>0.98 inet_down>800 disk_space>=120 "
         "cuda_vers>=12.1 rentable=true verified=true")
MAX_DPH = 0.7  # 48GB cards; A100 80GB (~$1.10/h) only after asking the user
SETUP_TIMEOUT_SEC = 3600
VARIANT_TIMEOUT_SEC = 75 * 60
DIR = "/workspace/InfiniteTalk"
VARIANTS = {
    "A": {"label": "standard 40 steps", "args": "--sample_steps 40", "est_min": 45},
    "B": {"label": "TeaCache 40 steps", "args": "--sample_steps 40 --use_teacache", "est_min": 25},
}

WEIGHTS_PY = r'''
import os
from huggingface_hub import hf_hub_download, snapshot_download
W = "weights"
# Wan2.1 base: everything EXCEPT the 65GB bf16 DiT shards and the 11GB bf16 T5 (fp8 versions below)
snapshot_download("Wan-AI/Wan2.1-I2V-14B-480P", local_dir=f"{W}/Wan2.1-I2V-14B-480P",
                  allow_patterns=["config.json", "*.json", "google/*", "xlm-roberta-large/*",
                                  "Wan2.1_VAE.pth", "models_clip_open-clip-xlm-roberta-large-vit-huge-14.pth"],
                  ignore_patterns=["diffusion_pytorch_model*", "models_t5_*"])
snapshot_download("MeiGen-AI/InfiniteTalk", local_dir=f"{W}/InfiniteTalk",
                  allow_patterns=["single/infinitetalk.safetensors", "quant_models/infinitetalk_single_fp8.*",
                                  "quant_models/t5_fp8.safetensors", "quant_models/t5_map_fp8.json",
                                  "quant_models/quant.json"])
snapshot_download("TencentGameMate/chinese-wav2vec2-base", local_dir=f"{W}/chinese-wav2vec2-base")
hf_hub_download("TencentGameMate/chinese-wav2vec2-base", "model.safetensors", revision="refs/pr/1",
                local_dir=f"{W}/chinese-wav2vec2-base")
total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(W) for f in fs)
print(f"weights total {total / 1e9:.1f} GB")
'''

SETUP_SCRIPT = f"""set -eo pipefail
{STAGE_FN}
export DEBIAN_FRONTEND=noninteractive PIP_ROOT_USER_ACTION=ignore PIP_NO_CACHE_DIR=1 HF_HUB_DISABLE_TELEMETRY=1
stage apt
apt-get update -qq && apt-get install -y -qq git ffmpeg libgl1 libglib2.0-0 build-essential ninja-build > /dev/null
which c++ nvcc ninja
mkdir -p /workspace && cd /workspace
stage clone
[ -d InfiniteTalk ] || git clone -q https://github.com/MeiGen-AI/InfiniteTalk.git
cd InfiniteTalk && git checkout -q {COMMIT}
# repo targets Python 3.10; the torch 2.4.1 image has 3.11, where inspect.ArgSpec was removed (2026-11-22)
sed -i 's/^from inspect import ArgSpec$/from inspect import FullArgSpec as ArgSpec/' wan/multitalk.py
stage pip
python -c "import torch, sys; print('torch', torch.__version__, 'cuda', torch.version.cuda, 'py', sys.version.split()[0])"
PYV=$(python -c 'import sys; print(f"cp{{sys.version_info[0]}}{{sys.version_info[1]}}")')
pip install -q --no-deps xformers==0.0.28 --index-url https://download.pytorch.org/whl/cu121
pip install -q --no-deps "https://github.com/Dao-AILab/flash-attention/releases/download/v2.7.4.post1/flash_attn-2.7.4.post1+cu12torch2.4cxx11abiFALSE-$PYV-$PYV-linux_x86_64.whl"
grep -viE '^(gradio|dashscope)' requirements.txt > /tmp/req.txt
# requirements.txt only has minimums: latest diffusers/transformers need torch>=2.6 and crash on 2.4.1
# (infer_schema error, 2026-11-22). Pin versions from InfiniteTalk's release era (mid-2025).
cat > /tmp/constraints.txt <<'PINS'
torch==2.4.1
torchvision==0.19.1
torchaudio==2.4.1
diffusers==0.33.1
transformers==4.49.0
tokenizers==0.21.0
accelerate==1.1.1
xfuser==0.4.1
optimum-quanto==0.2.6
numpy<2
huggingface_hub<1.0
PINS
pip install -q -r /tmp/req.txt -c /tmp/constraints.txt librosa einops "misaki[en]" "huggingface_hub[hf_xet]>=0.30"
python -c "import torch, flash_attn, xformers, librosa, decord, optimum.quanto, diffusers, transformers, xfuser; print('imports ok', torch.__version__, diffusers.__version__, transformers.__version__, torch.cuda.is_available())"
python -c "import sys; sys.argv=['x']; import wan; from wan.utils.multitalk_utils import save_video_ffmpeg; import generate_infinitetalk; print('wan + generate_infinitetalk imports ok')"
stage quanto-build
# Pre-compile optimum-quanto's CUDA kernels (fp8 Marlin) now, not mid-generation (few minutes, once per instance)
python -c "from optimum.quanto.library.extensions.cuda import ext; ext.lib; print('quanto cuda ext built')"
stage weights
python - <<'PY'
{WEIGHTS_PY}
PY
"""


def prompt_for(episode: dict) -> str:
    host = episode["host"]
    if host.get("prompt"):
        return host["prompt"]
    look_md = host_look(host)["scene"].parent / "look.md"
    sets = [l.split(":", 1)[1].strip() for l in look_md.read_text(encoding="utf-8").splitlines()
            if l.startswith("- Set:")] if look_md.exists() else []
    place = sets[0] if sets else "a sofa in a softly lit room"
    return ("A young East Asian woman with gold oval glasses and a high messy bun, wearing a blazer and a "
            f"small lavalier microphone, sits on {place}. She talks calmly and sincerely to the camera like a "
            "close friend late at night, natural subtle head movement, gentle blinking, soft expressions, "
            "hands relaxed and out of frame. Warm dim lighting, medium close-up, static camera.")


def run_variant(c: dict, name: str, job: str, out: Path) -> Path:
    v = VARIANTS[name]
    base = (f"cd {DIR} && python generate_infinitetalk.py"
            f" --ckpt_dir weights/Wan2.1-I2V-14B-480P --wav2vec_dir weights/chinese-wav2vec2-base"
            f" --infinitetalk_dir weights/InfiniteTalk/single/infinitetalk.safetensors"
            f" --quant fp8 --quant_dir weights/InfiniteTalk/quant_models/infinitetalk_single_fp8.safetensors"
            f" --input_json {job}/input.json --size infinitetalk-480 --mode streaming --motion_frame 9"
            f" --audio_save_dir {job}/audio_{name} --save_file {job}/out_{name} {v['args']}")
    for attempt, extra in enumerate(["", " --num_persistent_param_in_dit 0"]):  # 2nd try: low-VRAM mode
        try:
            ssh(c, f"bash -c {shlex.quote(base + extra + f' > {job}/log_{name}.txt 2>&1')}",
                timeout=VARIANT_TIMEOUT_SEC)
            break
        except RuntimeError:
            tail = ssh(c, f"tail -n 30 {job}/log_{name}.txt")
            if attempt == 0 and "out of memory" in tail.lower():
                print(f"Variant {name}: CUDA OOM -> retrying with --num_persistent_param_in_dit 0")
                continue
            raise RuntimeError(f"InfiniteTalk variant {name} failed:\n{tail}") from None
    remote = ssh(c, f"ls -t {job}/out_{name}*.mp4 | grep -v temp | head -n 1").strip()
    if not remote:
        raise RuntimeError(f"Variant {name}: no mp4 produced\n{ssh(c, f'tail -n 30 {job}/log_{name}.txt')}")
    with step(f"download variant {name}"):
        scp(c, f"{c['dest']}:{remote}", str(out))
    return out


def main() -> None:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episode_dir", type=Path, nargs="?")
    ap.add_argument("--variants", default="B,A")
    ap.add_argument("--budget", type=float, default=3.0, help="stop before a variant that would exceed this ($)")
    ap.add_argument("--offers", action="store_true", help="list matching GPUs and exit (no cost)")
    args = ap.parse_args()
    if args.offers:
        print_offers(find_offers(QUERY, MAX_DPH))
        return
    if not args.episode_dir:
        sys.exit(__doc__)

    from render_reel import render
    from tts import build_voice
    ep_dir = args.episode_dir.resolve()
    episode = json.loads((ep_dir / "episode.json").read_text(encoding="utf-8"))
    scene = host_look(episode["host"])["scene"]
    build_voice(ep_dir)
    voice = ep_dir / "audio" / "voice.mp3"
    names = [v.strip().upper() for v in args.variants.split(",") if v.strip()]
    bad = [n for n in names if n not in VARIANTS]
    if bad:
        sys.exit(f"Unknown variants {bad}; options: {list(VARIANTS)}")
    prompt = prompt_for(episode)
    print(f"Scene: {scene.relative_to(ROOT)}\nPrompt: {prompt}\nVariants: {names}  budget ${args.budget:.2f}")

    done: dict[str, Path] = {}
    try:
        with session(label="vdio-infinitetalk", image=IMAGE, disk_gb=DISK_GB, query=QUERY, max_dph=MAX_DPH,
                     setup_name="install InfiniteTalk + weights", setup_script=SETUP_SCRIPT,
                     setup_timeout=SETUP_TIMEOUT_SEC, budget_usd=args.budget) as (c, cost):
            job = f"/workspace/job{int(time.time())}"
            with step("upload scene + voice"):
                ssh(c, f"mkdir -p {job}")
                scp(c, str(scene), f"{c['dest']}:{job}/ref.png")
                scp(c, str(voice), f"{c['dest']}:{job}/voice.mp3")
                ssh(c, f"ffmpeg -v error -y -i {job}/voice.mp3 -ar 16000 -ac 1 {job}/voice.wav")
                spec = {"prompt": prompt, "cond_video": f"{job}/ref.png", "cond_audio": {"person1": f"{job}/voice.wav"}}
                ssh(c, f"cat > {job}/input.json <<'JSON'\n{json.dumps(spec, ensure_ascii=False, indent=2)}\nJSON")
            for name in names:
                # projected cost after this variant at the instance's hourly rate (+ margin for download/destroy)
                spent = cost()
                projected = spent + VARIANT_TIMEOUT_SEC / 3600 * c["dph"] + 0.05  # worst case: variant runs to timeout
                if projected > args.budget:
                    print(f"SKIP variant {name}: spent ${spent:.2f}, projected ${projected:.2f} > budget ${args.budget:.2f}")
                    continue
                out = ep_dir / "video" / f"host-infinitetalk-{name}.mp4"
                out.parent.mkdir(exist_ok=True)
                with step(f"InfiniteTalk variant {name} ({VARIANTS[name]['label']})"):
                    run_variant(c, name, job, out)
                done[name] = out
                print(f"Variant {name} done -> {out.relative_to(ROOT)} (spent so far ${cost():.2f})")
    finally:
        for name, clip in done.items():
            with step(f"render variant {name}"):
                series = ep_dir.parent.parent.name
                final = ROOT / "output" / series / f"{ep_dir.name}-video-infinitetalk-{name}.mp4"
                render(ep_dir, host_video=clip, out=final)
        report()


if __name__ == "__main__":
    main()
