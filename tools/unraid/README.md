Video Cutter Unraid helper scripts

Files and locations:
- tools/unraid/build-unraid-model-payload.ps1
- tools/unraid/import-model-payload-unraid.sh
- tools/unraid/update-video-cutter-unraid.sh
- tools/unraid/install-template-unraid.sh
- tools/unraid/create-desktop-shortcut-video-cutter-unraid.ps1
- tools/unraid/launch-video-cutter-unraid.bat

1) Build payload zip with model data not stored in GitHub (Windows)

PowerShell:
./tools/unraid/build-unraid-model-payload.ps1

Output:
- unraid-transfer/video-cutter-unraid-payload/
- unraid-transfer/video-cutter-unraid-payload.zip

2) Copy payload zip to Unraid and import model files

Example on Unraid:
chmod +x tools/unraid/import-model-payload-unraid.sh
./tools/unraid/import-model-payload-unraid.sh /path/to/video-cutter-unraid-payload.zip

Target folder on Unraid:
/mnt/user/appdata/video-cutter/nsfw-model

3) Install Unraid template automatically

On Unraid:
chmod +x tools/unraid/install-template-unraid.sh
./tools/unraid/install-template-unraid.sh

Template file is created at:
/boot/config/plugins/dockerMan/templates-user/my-video-cutter.xml

The template exposes 4 clear editable locations in Unraid Edit:
- 1. Folder źródłowy        -> mounted to /data/source
- 2. Folder docelowy        -> mounted to /data/output
- 3. Folder tymczasowy      -> mounted to /data/temp
- 4. Folder modelu NSFW     -> mounted to /data/nsfw-model

All four mounts are used by the container runtime. The model folder keeps the private NSFW files separate, while source/output/temp are used for uploads, exports, cache and app runtime data.

4) Update/recreate container automatically on Unraid

On Unraid:
chmod +x tools/unraid/update-video-cutter-unraid.sh
./tools/unraid/update-video-cutter-unraid.sh

Optional env overrides:
IMAGE=ghcr.io/maniek-o/video-cutter:latest SOURCE_HOST_PATH=/mnt/user/appdata/video-cutter/source OUTPUT_HOST_PATH=/mnt/user/appdata/video-cutter/output TEMP_HOST_PATH=/mnt/user/appdata/video-cutter/temp MODEL_HOST_PATH=/mnt/user/appdata/video-cutter/nsfw-model WEBUI_PORT=5001 API_PORT=5003 USE_DRI=1 ./tools/unraid/update-video-cutter-unraid.sh

5) Create Windows desktop shortcut for Electron remote WebUI

PowerShell:
./tools/unraid/create-desktop-shortcut-video-cutter-unraid.ps1 -TargetUrl "http://IP_UNRAID:5001"

This creates:
Desktop/Video-cutter (unraid).lnk

6) Launch Electron in remote-only mode manually

tools/unraid/launch-video-cutter-unraid.bat

Optional URL env before launch:
set VIDEO_CUTTER_UNRAID_URL=http://IP_UNRAID:5001
