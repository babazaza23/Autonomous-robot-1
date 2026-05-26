param(
  [string]$Output = "wms-robot-dashboard-clean.zip"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputPath = if ([System.IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path $root $Output }
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("wms-clean-" + [System.Guid]::NewGuid().ToString("N"))

$excludedDirs = @(
  "node_modules", "dist", "build", ".vite", ".venv", "venv", "env",
  "ai-server/.venv", "ai-server/venv", "ai-server/env",
  "ai-server/frames", "ai-server/runs", "ai-server/logs",
  "ai-server/wms_uploads", "ai-server/wms_data", "ai-server/eval_results", "__pycache__"
)

$excludedExtensions = @(".pt", ".onnx", ".engine", ".zip", ".log")
$excludedFiles = @(".env", ".env.local")

function Test-ExcludedPath {
  param([string]$FullName)
  $relative = [System.IO.Path]::GetRelativePath($root, $FullName).Replace("\", "/")
  foreach ($dir in $excludedDirs) {
    $normalized = $dir.Replace("\", "/").TrimEnd("/")
    if ($relative -eq $normalized -or $relative.StartsWith("$normalized/")) {
      return $true
    }
    if ($relative -like "*/__pycache__/*" -or $relative -like "*/__pycache__") {
      return $true
    }
  }
  if ($excludedFiles -contains ([System.IO.Path]::GetFileName($relative))) {
    return $true
  }
  if ($relative -like ".env.*.local") {
    return $true
  }
  return $excludedExtensions -contains ([System.IO.Path]::GetExtension($relative).ToLowerInvariant())
}

if (Test-Path -LiteralPath $temp) {
  Remove-Item -LiteralPath $temp -Recurse -Force
}
New-Item -ItemType Directory -Path $temp | Out-Null

Get-ChildItem -LiteralPath $root -Force | Where-Object { $_.FullName -ne $temp -and $_.FullName -ne $outputPath } | ForEach-Object {
  if (Test-ExcludedPath $_.FullName) {
    return
  }
  $destination = Join-Path $temp $_.Name
  if ($_.PSIsContainer) {
    Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force -Exclude @()
  } else {
    Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
  }
}

Get-ChildItem -LiteralPath $temp -Recurse -Force | Sort-Object FullName -Descending | ForEach-Object {
  if (Test-ExcludedPath $_.FullName.Replace($temp, $root)) {
    Remove-Item -LiteralPath $_.FullName -Recurse -Force
  }
}

if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}
Compress-Archive -Path (Join-Path $temp "*") -DestinationPath $outputPath -Force
Remove-Item -LiteralPath $temp -Recurse -Force

Write-Host "Created clean ZIP: $outputPath"
