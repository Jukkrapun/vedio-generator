"""Download MuseTalk 1.5 inference weights from the official HuggingFace repos (used at image build).
Not MuseTalk's download_weights.sh: it upgrades huggingface_hub to 1.x and uses the China mirror."""
import os

from huggingface_hub import hf_hub_download

M = "models"
WEIGHTS = [
    ("TMElyralab/MuseTalk", ["musetalkV15/musetalk.json", "musetalkV15/unet.pth"], ""),
    ("stabilityai/sd-vae-ft-mse", ["config.json", "diffusion_pytorch_model.bin"], "/sd-vae"),
    ("openai/whisper-tiny", ["config.json", "pytorch_model.bin", "preprocessor_config.json"], "/whisper"),
    ("yzd-v/DWPose", ["dw-ll_ucoco_384.pth"], "/dwpose"),
]
os.makedirs(f"{M}/face-parse-bisent", exist_ok=True)
for repo, files, sub in WEIGHTS:
    for f in files:
        print("weights:", repo, f, flush=True)
        hf_hub_download(repo, f, local_dir=M + sub)
