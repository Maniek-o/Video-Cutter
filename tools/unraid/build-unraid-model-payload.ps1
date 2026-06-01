Param(
  [string]$SourceDir = "Pliki do modelu NFSW",
  [string]$OutputRoot = "unraid-transfer",
  [string]$PayloadName = "video-cutter-unraid-payload"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $repoRoot

$srcPath = Join-Path $repoRoot $SourceDir
if (-not (Test-Path $srcPath)) {
  throw "Source directory not found: $srcPath"
}

$outputRootPath = Join-Path $repoRoot $OutputRoot
$payloadDir = Join-Path $outputRootPath $PayloadName
$bundleDir = Join-Path $payloadDir "nsfw-model"
$zipPath = Join-Path $outputRootPath "$PayloadName.zip"

if (Test-Path $payloadDir) {
  Remove-Item -Recurse -Force $payloadDir
}
if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null

Write-Host "Copying model data from $srcPath"
Copy-Item -Path (Join-Path $srcPath "*") -Destination $bundleDir -Recurse -Force

$readmePath = Join-Path $payloadDir "README_UNRAID_PAYLOAD.txt"
@"
Video Cutter Unraid payload

Contents:
- nsfw-model/            -> copy this to /mnt/user/appdata/video-cutter/nsfw-model on Unraid

Unraid commands:
mkdir -p /mnt/user/appdata/video-cutter/nsfw-model
cp -r /path/to/nsfw-model/* /mnt/user/appdata/video-cutter/nsfw-model/

Then run container with:
- NSFW_MODEL_DATA_DIR=/data/nsfw-model
- volume: /mnt/user/appdata/video-cutter/nsfw-model:/data/nsfw-model
"@ | Set-Content -Path $readmePath -Encoding UTF8

Write-Host "Creating archive: $zipPath"
Compress-Archive -Path (Join-Path $payloadDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Done."
Write-Host "Folder: $payloadDir"
Write-Host "Zip:    $zipPath"
