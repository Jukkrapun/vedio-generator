# Ops dashboard worker: runs tools/*.py jobs (tts, render, catalog, publish_fb, posters).
# Build context: repo root. Code and data come in via bind mounts (see docker-compose.yml).
FROM python:3.13-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fonts-thai-tlwg fontconfig openssh-client \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
ENV PYTHONUNBUFFERED=1 PYTHONIOENCODING=utf-8 TZ=Asia/Bangkok
CMD ["python", "ops/worker.py"]
