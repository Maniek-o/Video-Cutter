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
  <Overview>Video Cutter all-in-one (WebUI + ML API), CPU-only inference, Intel Quick Sync via /dev/dri. W Unraid możesz ustawić 4 czytelne foldery: źródłowy, docelowy, tymczasowy i modelu NSFW.</Overview>
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
  <Config Name="1. Folder źródłowy" Target="/data/source" Default="/mnt/user/appdata/video-cutter/source" Mode="rw" Description="Miejsce na pliki wejściowe / importowane" Type="Path" Display="always" Required="true" Mask="false">/mnt/user/appdata/video-cutter/source</Config>
  <Config Name="2. Folder docelowy" Target="/data/output" Default="/mnt/user/appdata/video-cutter/output" Mode="rw" Description="Miejsce na eksportowane, gotowe pliki" Type="Path" Display="always" Required="true" Mask="false">/mnt/user/appdata/video-cutter/output</Config>
  <Config Name="3. Folder tymczasowy" Target="/data/temp" Default="/mnt/user/appdata/video-cutter/temp" Mode="rw" Description="Pliki robocze, cache i materiał przejściowy" Type="Path" Display="always" Required="true" Mask="false">/mnt/user/appdata/video-cutter/temp</Config>
  <Config Name="4. Folder modelu NSFW" Target="/data/nsfw-model" Default="/mnt/user/appdata/video-cutter/nsfw-model" Mode="rw" Description="Prywatne pliki modelu NSFW używane przez aplikację" Type="Path" Display="always" Required="true" Mask="false">/mnt/user/appdata/video-cutter/nsfw-model</Config>
  <Config Name="NSFW_MODEL_DATA_DIR" Target="NSFW_MODEL_DATA_DIR" Default="/data/nsfw-model" Mode="" Description="Container path for model data" Type="Variable" Display="always" Required="true" Mask="false">/data/nsfw-model</Config>
  <Config Name="Intel Quick Sync device" Target="/dev/dri" Default="/dev/dri" Mode="" Description="Pass Intel iGPU device to container" Type="Device" Display="always" Required="false" Mask="false">/dev/dri</Config>
</Container>
EOF

echo "Template created: ${TEMPLATE_PATH}"
ls -l "${TEMPLATE_PATH}"
