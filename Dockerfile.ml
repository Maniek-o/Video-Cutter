FROM python:3.10-slim

LABEL org.opencontainers.image.title="Video Cutter" \
    org.opencontainers.image.description="ML backend for Video Cutter" \
    org.opencontainers.image.source="https://github.com/Maniek-o/Video-Cutter" \
    org.opencontainers.image.vendor="Maniek-o"

ENV PYTHONUNBUFFERED=1 \
    PORT=5003 \
    HOST=0.0.0.0 \
    NSFW_MODEL_DATA_DIR=/data/nsfw-model


WORKDIR /app

# Instalacja ffmpeg, sterowników VAAPI/QSV, tini
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
       intel-media-va-driver \
       i965-va-driver \
       va-driver-all \
       libva2 \
       libva-drm2 \
       libva-x11-2 \
    # libmfx-dev \
       vainfo \
       ca-certificates \
       curl \
       tini \
    && rm -rf /var/lib/apt/lists/*

COPY ml_backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY ml_backend/ ./ml_backend/
RUN mkdir -p /data/nsfw-model

VOLUME ["/data/nsfw-model"]

WORKDIR /app/ml_backend


CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5003"]

EXPOSE 5003
