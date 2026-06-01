#!/bin/bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/video-cutter-unraid-payload.zip"
  exit 1
fi

ZIP_PATH="$1"
MODEL_HOST_PATH="${MODEL_HOST_PATH:-/mnt/user/appdata/video-cutter/nsfw-model}"
TMP_DIR="${TMP_DIR:-/tmp/video-cutter-payload}"

if [[ ! -f "${ZIP_PATH}" ]]; then
  echo "Payload zip not found: ${ZIP_PATH}"
  exit 1
fi

mkdir -p "${TMP_DIR}"
rm -rf "${TMP_DIR}"/*

echo "[1/4] Unpacking payload: ${ZIP_PATH}"
unzip -o "${ZIP_PATH}" -d "${TMP_DIR}" >/dev/null

SRC_DIR="${TMP_DIR}/nsfw-model"
if [[ ! -d "${SRC_DIR}" ]]; then
  # fallback when zip contains parent folder
  SRC_DIR_FALLBACK=$(find "${TMP_DIR}" -maxdepth 3 -type d -name nsfw-model | head -n 1 || true)
  if [[ -z "${SRC_DIR_FALLBACK}" ]]; then
    echo "Could not find nsfw-model folder in payload"
    exit 1
  fi
  SRC_DIR="${SRC_DIR_FALLBACK}"
fi

echo "[2/4] Preparing target dir: ${MODEL_HOST_PATH}"
mkdir -p "${MODEL_HOST_PATH}"

echo "[3/4] Copying model payload to target"
cp -a "${SRC_DIR}/." "${MODEL_HOST_PATH}/"

echo "[4/4] Done"
ls -lah "${MODEL_HOST_PATH}" | head -n 20
