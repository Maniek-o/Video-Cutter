Video Cutter Unraid helper scripts

1) Build payload zip with model data not stored in GitHub

PowerShell:
./tools/unraid/build-unraid-model-payload.ps1

Output:
- unraid-transfer/video-cutter-unraid-payload/
- unraid-transfer/video-cutter-unraid-payload.zip

Copy nsfw-model content from the payload to:
/mnt/user/appdata/video-cutter/nsfw-model

2) Create Windows desktop shortcut for Electron remote WebUI

PowerShell:
./tools/unraid/create-desktop-shortcut-video-cutter-unraid.ps1 -TargetUrl "http://IP_UNRAID:5001"

This creates:
Desktop/Video-cutter (unraid).lnk

3) Launch Electron in remote-only mode manually

tools/unraid/launch-video-cutter-unraid.bat

Optional: set URL before launch
set VIDEO_CUTTER_UNRAID_URL=http://IP_UNRAID:5001
