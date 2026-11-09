$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
if (!(Test-Path (Join-Path $projectRoot 'node_modules/vite/bin/vite.js'))) {
 Push-Location $projectRoot
 try { & npm ci; if ($LASTEXITCODE -ne 0) { throw '前端依赖安装失败。' } } finally { Pop-Location }
}
if (!(Get-NetTCPConnection -LocalPort 5199 -State Listen -ErrorAction SilentlyContinue)) {
 $nodeExe=(Get-Command node).Source
 Start-Process $nodeExe -ArgumentList 'node_modules/vite/bin/vite.js --mode connected --host 127.0.0.1 --port 5199 --strictPort' -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput "$projectRoot/connected-start.log" -RedirectStandardError "$projectRoot/connected-start-error.log"
}
Write-Host 'Connected admin: http://127.0.0.1:5199/'
Write-Host 'Default business backend: http://127.0.0.1:8081 (requires its database and ADMIN account)'
Write-Host 'Original local simulation: http://127.0.0.1:5195/'
