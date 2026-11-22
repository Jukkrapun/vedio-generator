"""MuseTalk 1.5 lip-sync on vast.ai — rents a GPU instance only for the job, then destroys it.

Used by tools/lipsync.py when the engine is "musetalk". Standalone:
    python tools/musetalk_vast.py --offers     # show the cheapest matching GPUs (no cost)
    python tools/musetalk_vast.py --cleanup    # destroy an instance left over from a crashed run
    python tools/musetalk_vast.py --check      # (fixed-instance mode) test the SSH connection

Flow per job (on-demand, default):
  search cheapest offer -> create instance -> wait for SSH -> install MuseTalk 1.5 + weights
  -> upload face/voice -> inference -> download mp4 -> DESTROY instance (always, also on errors).
The live instance id is written to .vast-instance.json (git-ignored) until destroyed, so a crash
can be cleaned up with --cleanup. Billing stops only when the instance is destroyed.

.env:
    VAST_API_KEY=...            vast.ai → Account → API Keys  (never print it)
    VAST_SSH_KEY=C:/Users/<you>/.ssh/id_ed25519   optional; its .pub must be in vast.ai → Account → SSH Keys
    VAST_QUERY=...              optional offer filter (default DEFAULT_QUERY below)
    VAST_MAX_DPH=0.6            optional max $/hour
  Fixed-instance mode instead (instance you keep running yourself): VAST_SSH_HOST + VAST_SSH_PORT,
  optional VAST_SSH_USER, MUSETALK_DIR, MUSETALK_PYTHON.
"""
import os
import shlex
import sys
import time
from contextlib import contextmanager
from pathlib import Path

from media import ROOT
from timing import step
from vast import STAGE_FN, cleanup, find_offers, print_offers, scp, session, ssh

REMOTE_ROOT = "/tmp/vdio-musetalk"
JOB_TIMEOUT_SEC = 1800
BASE_IMAGE = "pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime"  # torch version MuseTalk 1.5 expects
# VAST_IMAGE = our prebuilt image (docker/musetalk/): MuseTalk + weights baked in, setup is skipped.
# Without it we fall back to BASE_IMAGE + installing everything on the instance (~7 min).
DISK_GB = 40
DEFAULT_QUERY = ("num_gpus=1 geolocation!=CN gpu_ram>=16 reliability>0.98 inet_down>800 disk_space>=50 "
                 "cuda_vers>=11.8 rentable=true verified=true")
SETUP_TIMEOUT_SEC = 2400
MUSETALK_DIR = "/workspace/MuseTalk"
# Weights: NOT MuseTalk's download_weights.sh — it upgrades huggingface_hub to 1.x (no more
# `huggingface-cli`, breaks the pinned deps) and uses the China mirror hf-mirror.com (2026-11-22).
WEIGHTS_PY = r'''
from huggingface_hub import hf_hub_download as get
M = "models"
for repo, files, sub in [
    ("TMElyralab/MuseTalk", ["musetalkV15/musetalk.json", "musetalkV15/unet.pth"], ""),  # v1 weights unused
    ("stabilityai/sd-vae-ft-mse", ["config.json", "diffusion_pytorch_model.bin"], "/sd-vae"),
    ("openai/whisper-tiny", ["config.json", "pytorch_model.bin", "preprocessor_config.json"], "/whisper"),
    ("yzd-v/DWPose", ["dw-ll_ucoco_384.pth"], "/dwpose"),
    ("ByteDance/LatentSync", ["latentsync_syncnet.pt"], "/syncnet"),
]:
    for f in files:
        print("weights:", repo, f, flush=True)
        get(repo, f, local_dir=M + sub)
'''
SETUP_SCRIPT = f"""set -eo pipefail
if [ -f {MUSETALK_DIR}/.ready ]; then echo ready; exit 0; fi
export DEBIAN_FRONTEND=noninteractive HF_HUB_ENABLE_HF_TRANSFER=0
{STAGE_FN}
stage apt
apt-get update -qq && apt-get install -y -qq git ffmpeg wget curl libgl1 libglib2.0-0 > /dev/null
/usr/bin/ffmpeg -hide_banner -encoders | grep -q libx264 && echo "ffmpeg libx264 ok"
which -a ffmpeg
mkdir -p /workspace && cd /workspace
stage clone
[ -d MuseTalk ] || git clone -q https://github.com/TMElyralab/MuseTalk.git
cd MuseTalk
stage pip-requirements
pip install -q --root-user-action=ignore -r requirements.txt
stage mmlab
pip install -q --root-user-action=ignore -U openmim
mim install -q mmengine
mim install -q "mmcv==2.0.1"
mim install -q "mmdet==3.1.0"
mim install -q "mmpose==1.1.0"
pip install -q --root-user-action=ignore gdown "huggingface_hub>=0.30,<1.0" hf_xet  # hf_xet: much faster HF downloads
stage weights-hf
mkdir -p models/face-parse-bisent
python - <<'PY'
{WEIGHTS_PY}
PY
stage weights-face-parse
gdown -q 154JgKpzCPW82qINcVieuPH3fZ2e0P812 -O models/face-parse-bisent/79999_iter.pth
curl -sSL https://download.pytorch.org/models/resnet18-5c106cde.pth -o models/face-parse-bisent/resnet18-5c106cde.pth
test -s models/musetalkV15/unet.pth && test -s models/face-parse-bisent/79999_iter.pth
touch .ready && echo ready
"""


def fixed_cfg() -> dict | None:
    host, port = os.getenv("VAST_SSH_HOST"), os.getenv("VAST_SSH_PORT")
    if not host or not port:
        return None
    return {"dest": f"{os.getenv('VAST_SSH_USER', 'root')}@{host}", "port": port,
            "key": os.getenv("VAST_SSH_KEY"), "dir": os.getenv("MUSETALK_DIR", MUSETALK_DIR),
            "python": os.getenv("MUSETALK_PYTHON", "python")}


# ---------- job ----------

def infer(c: dict, image_or_video: Path, audio: Path, out: Path, bbox_shift: int, fps: int) -> Path:
    job = f"{REMOTE_ROOT}/{int(time.time())}"
    src_name = "face" + image_or_video.suffix.lower()
    with step(f"upload {image_or_video.name} + {audio.name}"):
        ssh(c, f"mkdir -p {job}/results")
        scp(c, str(image_or_video), f"{c['dest']}:{job}/{src_name}")
        scp(c, str(audio), f"{c['dest']}:{job}/voice{audio.suffix}")
    config = (f"task_0:\n  video_path: \"{job}/{src_name}\"\n  audio_path: \"{job}/voice{audio.suffix}\"\n"
              f"  bbox_shift: {bbox_shift}\n")
    ssh(c, f"cat > {job}/task.yaml <<'YAML'\n{config}YAML")
    # PATH: apt's /usr/bin/ffmpeg (has libx264) before the image's conda ffmpeg, which rejected -crf
    cmd = (f"cd {shlex.quote(c['dir'])} && PATH=/usr/bin:$PATH {c['python']} -m scripts.inference"
           f" --inference_config {job}/task.yaml --result_dir {job}/results"
           f" --unet_model_path models/musetalkV15/unet.pth --unet_config models/musetalkV15/musetalk.json"
           f" --version v15 --fps {fps}")
    with step("MuseTalk inference"):
        log = ssh(c, f"bash -c {shlex.quote(cmd + ' 2>&1 | tail -n 40; exit ${PIPESTATUS[0]}')}", timeout=JOB_TIMEOUT_SEC)
        remote = ssh(c, f"ls -t {job}/results/v15/*.mp4 2>/dev/null | head -n 1").strip()
        frames = f"{job}/results/v15/face_voice"
        if not remote and ssh(c, f"ls {frames} 2>/dev/null | head -n 1").strip():
            # MuseTalk's own ffmpeg step failed but the lip-synced frames exist: assemble them ourselves
            print("MuseTalk's ffmpeg step failed — assembling frames with /usr/bin/ffmpeg")
            remote = f"{job}/results/v15/face_voice.mp4"
            ssh(c, f"/usr/bin/ffmpeg -y -v error -r {fps} -f image2 -i {frames}/%08d.png "
                   f"-i {job}/voice{audio.suffix} -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -shortest {remote}",
                timeout=600)
        if not remote:
            raise RuntimeError(f"MuseTalk produced no mp4. Last log lines:\n{log}")
    with step("download result"):
        scp(c, f"{c['dest']}:{remote}", str(out))
        ssh(c, f"rm -rf {job}")
    return out


@contextmanager
def musetalk_session():
    """Yield a ready MuseTalk connection; rent + set up once, destroy on exit (also on errors).
    Use it to lip-sync many clips on one instance: setup time is paid once per batch."""
    c = fixed_cfg()
    if c:  # user keeps an instance running
        yield c
        return
    with session(label="vdio-musetalk", image=os.getenv("VAST_IMAGE", BASE_IMAGE), disk_gb=DISK_GB,
                 query=os.getenv("VAST_QUERY", DEFAULT_QUERY), max_dph=float(os.getenv("VAST_MAX_DPH", "0.6")),
                 setup_name="install MuseTalk 1.5 + weights", setup_script=SETUP_SCRIPT,
                 setup_timeout=SETUP_TIMEOUT_SEC) as (c, _cost):
        c.update(dir=MUSETALK_DIR, python="python")
        yield c


def run_musetalk(image_or_video: Path, audio: Path, out: Path, bbox_shift: int = 0, fps: int = 25) -> Path:
    """One clip on its own instance. For several clips use musetalk_session() + infer()."""
    with musetalk_session() as c:
        return infer(c, image_or_video, audio, out, bbox_shift, fps)


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
    arg = sys.argv[1:]
    if arg == ["--offers"]:
        print_offers(find_offers(os.getenv("VAST_QUERY", DEFAULT_QUERY), float(os.getenv("VAST_MAX_DPH", "0.6"))))
    elif arg == ["--cleanup"]:
        cleanup()
    elif arg == ["--check"]:
        c = fixed_cfg() or sys.exit("--check is for fixed-instance mode (VAST_SSH_HOST/PORT)")
        print(ssh(c, f"cd {shlex.quote(c['dir'])} && ls models/musetalkV15 && nvidia-smi -L").strip())
    else:
        sys.exit(__doc__)
