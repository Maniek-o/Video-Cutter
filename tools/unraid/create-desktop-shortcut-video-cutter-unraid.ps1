Param(
  [string]$TargetUrl = "http://127.0.0.1:5001"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $repoRoot
$launcher = Join-Path $repoRoot "tools\unraid\launch-video-cutter-unraid.bat"
if (-not (Test-Path $launcher)) {
  throw "Launcher not found: $launcher"
}

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Video-cutter (unraid).lnk"

$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = $launcher
$sc.WorkingDirectory = $repoRoot
$sc.Arguments = ""
$sc.Description = "Video Cutter (Unraid WebUI in Electron)"
$sc.IconLocation = (Join-Path $repoRoot "public\icon.png")
$sc.Save()

[Environment]::SetEnvironmentVariable("VIDEO_CUTTER_UNRAID_URL", $TargetUrl, "User")

Write-Host "Shortcut created: $shortcutPath"
Write-Host "VIDEO_CUTTER_UNRAID_URL set to: $TargetUrl"
