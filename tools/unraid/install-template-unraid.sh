#!/bin/bash
set -euo pipefail

TEMPLATE_PATH="/boot/config/plugins/dockerMan/templates-user/my-video-cutter.xml"
mkdir -p "/boot/config/plugins/dockerMan/templates-user"

cat > "${TEMPLATE_PATH}" <<'EOF'
<Container version="2">
  <Name>video-cutter</Name>
  <Repository>ghcr.io/maniek-o/video-cutter:latest</Repository>
  <Registry>https://ghcr.io</Registry>
  <Network>bridge</Network>
  <MyIP/>
  <Shell>sh</Shell>
  <Privileged>false</Privileged>
  <Support>https://github.com/Maniek-o/Video-Cutter</Support>
  <Project>https://github.com/Maniek-o/Video-Cutter</Project>
  <Overview>Video Cutter all-in-one (WebUI + ML API), CPU-only inference, Intel Quick Sync via /dev/dri.</Overview>
  <Category>MediaApp:Video</Category>
  <WebUI>http://[IP]:[PORT:5001]</WebUI>
  <TemplateURL/>
  <Icon>https://raw.githubusercontent.com/Maniek-o/Video-Cutter/master/public/icon.png</Icon>
  <ExtraParams/>
  <PostArgs/>
  <CPUset/>
  <DateInstalled></DateInstalled>
  <DonateText/>
  <DonateLink/>
  <Requires/>

  <Config Name="WebUI Port" Target="5001" Default="5001" Mode="tcp" Description="WebUI port" Type="Port" Display="always" Required="true" Mask="false">5001</Config>
  <Config Name="ML API Port" Target="5003" Default="5003" Mode="tcp" Description="ML backend API port" Type="Port" Display="always" Required="true" Mask="false">5003</Config>
  <Config Name="NSFW source path (host)" Target="/data/nsfw-source" Default="/mnt/user/appdata/video-cutter/nsfw-source" Mode="rw" Description="Optional source location for raw NSFW files" Type="Path" Display="always" Required="false" Mask="false">/mnt/user/appdata/video-cutter/nsfw-source</Config>
  <Config Name="NSFW payload path (host)" Target="/data/nsfw-payload" Default="/mnt/user/appdata/video-cutter/nsfw-payload" Mode="rw" Description="Optional payload/staging location" Type="Path" Display="always" Required="false" Mask="false">/mnt/user/appdata/video-cutter/nsfw-payload</Config>
  <Config Name="NSFW model data path (host)" Target="/data/nsfw-model" Default="/mnt/user/appdata/video-cutter/nsfw-model" Mode="rw" Description="Target runtime model location used by the app" Type="Path" Display="always" Required="true" Mask="false">/mnt/user/appdata/video-cutter/nsfw-model</Config>
  <Config Name="NSFW_MODEL_DATA_DIR" Target="NSFW_MODEL_DATA_DIR" Default="/data/nsfw-model" Mode="" Description="Container path for model data" Type="Variable" Display="always" Required="true" Mask="false">/data/nsfw-model</Config>
  <Config Name="Intel Quick Sync device" Target="/dev/dri" Default="/dev/dri" Mode="" Description="Pass Intel iGPU device to container" Type="Device" Display="always" Required="false" Mask="false">/dev/dri</Config>
</Container>
EOF

echo "Template created: ${TEMPLATE_PATH}"
ls -l "${TEMPLATE_PATH}"
