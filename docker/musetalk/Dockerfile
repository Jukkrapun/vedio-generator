# MuseTalk 1.5 ready-to-run image for vast.ai (tools/musetalk_vast.py).
# Everything is baked in (code, Python deps, all inference weights), so a rented instance only
# pulls this image and runs inference — no apt/pip/HF downloads at job time.
#
# Build + push:  powershell docker/musetalk/build.ps1   (see README.md)
FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime

ARG MUSETALK_COMMIT=2536eaf06b85f775d8e04b7fd81bf6699155a58d
ENV DEBIAN_FRONTEND=noninteractive PIP_ROOT_USER_ACTION=ignore PIP_NO_CACHE_DIR=1 \
    HF_HUB_DISABLE_TELEMETRY=1 PYTHONUNBUFFERED=1
# apt ffmpeg (with libx264) must win over the conda ffmpeg in the base image, which rejects -crf
ENV PATH=/usr/bin:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
        git ffmpeg wget curl libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && /usr/bin/ffmpeg -hide_banner -encoders | grep -q libx264

WORKDIR /workspace
RUN git clone https://github.com/TMElyralab/MuseTalk.git && cd MuseTalk && git checkout ${MUSETALK_COMMIT}
WORKDIR /workspace/MuseTalk

# requirements.txt minus training/UI-only packages (tensorflow, tensorboard, gradio: ~2GB, unused by inference)
RUN grep -viE '^(tensorflow|tensorboard|gradio)' requirements.txt > /tmp/req.txt \
    && pip install -r /tmp/req.txt \
    && pip install -U openmim \
    && mim install mmengine "mmcv==2.0.1" "mmdet==3.1.0" "mmpose==1.1.0" \
    && pip install gdown "huggingface_hub>=0.30,<1.0" hf_xet

# Inference weights only (no v1 UNet, no SyncNet — those are for v1 / training)
COPY fetch_weights.py /tmp/fetch_weights.py
RUN python /tmp/fetch_weights.py \
    && gdown 154JgKpzCPW82qINcVieuPH3fZ2e0P812 -O models/face-parse-bisent/79999_iter.pth \
    && curl -fsSL https://download.pytorch.org/models/resnet18-5c106cde.pth -o models/face-parse-bisent/resnet18-5c106cde.pth \
    && curl -fsSL https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth \
         -o musetalk/utils/face_detection/detection/sfd/s3fd.pth \
    && test -s models/musetalkV15/unet.pth && test -s models/face-parse-bisent/79999_iter.pth \
    && test -s musetalk/utils/face_detection/detection/sfd/s3fd.pth \
    && touch .ready

# Import check at build time (no GPU needed): catches missing Python deps before we pay for a GPU.
RUN python -c "import diffusers, transformers, mmpose, mmdet, mmcv, librosa, cv2, omegaconf; print('imports ok')"
