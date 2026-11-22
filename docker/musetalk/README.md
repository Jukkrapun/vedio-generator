# MuseTalk 1.5 image for vast.ai

Prebuilt image used by `tools/musetalk_vast.py` (set `VAST_IMAGE` in `.env`). Code, Python deps and
all inference weights are baked in, so a rented GPU only pulls the image and runs inference —
no apt / pip / HuggingFace downloads per job (that took ~7 min per job before, and up to 40+ min on
slow hosts).

Contents: `pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime` + MuseTalk (pinned commit, see `ARG
MUSETALK_COMMIT`) + mmcv/mmdet/mmpose + weights: musetalkV15 UNet, sd-vae-ft-mse, whisper-tiny,
DWPose, face-parse-bisent, resnet18, s3fd. Left out: tensorflow/tensorboard/gradio, v1 UNet,
SyncNet (training / UI only). Public image — contains only open-source code and public weights,
no keys or project files.

## Build & push (local Docker Desktop)

```powershell
docker build -t vdio-musetalk:1.5 docker/musetalk
docker login                                   # once, interactive
docker tag vdio-musetalk:1.5 <dockerhub-user>/vdio-musetalk:1.5
docker push <dockerhub-user>/vdio-musetalk:1.5
```
Then in `.env`: `VAST_IMAGE=<dockerhub-user>/vdio-musetalk:1.5`.

Rebuild only when bumping MuseTalk or deps; bump the tag (`:1.5-2`, ...) and `VAST_IMAGE` together.
