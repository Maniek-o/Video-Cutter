#!/bin/bash
set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/maniek-o/video-cutter:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-video-cutter}"
MODEL_HOST_PATH="${MODEL_HOST_PATH:-/mnt/user/appdata/video-cutter/nsfw-model}"
WEBUI_PORT="${WEBUI_PORT:-5001}"
API_PORT="${API_PORT:-5003}"
USE_DRI="${USE_DRI:-1}"

echo "[1/6] Pulling image: ${IMAGE}"
docker pull "${IMAGE}"

echo "[2/6] Stopping/removing old container (if exists)"
docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "[3/6] Ensuring model directory exists: ${MODEL_HOST_PATH}"
mkdir -p "${MODEL_HOST_PATH}"

echo "[4/6] Building docker run arguments"
RUN_ARGS=(
  -d
  --name "${CONTAINER_NAME}"
  --restart unless-stopped
  -p "${WEBUI_PORT}:5001"
  -p "${API_PORT}:5003"
  -e "NSFW_MODEL_DATA_DIR=/data/nsfw-model"
  -v "${MODEL_HOST_PATH}:/data/nsfw-model"
)

if [[ "${USE_DRI}" == "1" && -e /dev/dri ]]; then
  RUN_ARGS+=(--device /dev/dri:/dev/dri)
else
  echo "[info] /dev/dri not available or USE_DRI=0, starting without Intel device mapping"
fi

echo "[5/6] Starting container: ${CONTAINER_NAME}"
docker run "${RUN_ARGS[@]}" "${IMAGE}"

echo "[6/6] Health preview"
docker ps --filter "name=${CONTAINER_NAME}"
sleep 2
docker logs --tail 60 "${CONTAINER_NAME}" || true

echo "Done."
echo "WebUI: http://$(hostname -I | awk '{print $1}'):${WEBUI_PORT}"
echo "API:   http://$(hostname -I | awk '{print $1}'):${API_PORT}/api/ml/health"
