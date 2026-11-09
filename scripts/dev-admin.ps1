$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$replicaRoot = Join-Path $repositoryRoot 'frontend'
$serverRoot = Join-Path $repositoryRoot 'backend/account-service'
function Wait-LocalService([string]$Url, [string]$Name) {
 for ($attempt = 0; $attempt -lt 60; $attempt++) {
  try { $response = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { return } } catch {}
  Start-Sleep -Milliseconds 500
 }
 throw "$Name 启动失败，请检查目录中的日志：$replicaRoot"
}
if (Get-NetTCPConnection -LocalPort 8092 -State Listen -ErrorAction SilentlyContinue) {
 $health = Invoke-RestMethod 'http://127.0.0.1:8092/api/health' -TimeoutSec 5
 if ($health.service -ne 'admin-account-service' -or !$health.ready) { throw '8092 端口被其他服务占用。' }
} else {
 $javaExe = (Get-Command java -ErrorAction Stop).Source
 $jarPath = Join-Path $serverRoot 'target/admin-account-service-0.1.0.jar'
 if (!(Test-Path -LiteralPath $jarPath)) {
  Push-Location $serverRoot
  try { & mvn -q -DskipTests package; if ($LASTEXITCODE -ne 0) { throw '账号服务构建失败。' } } finally { Pop-Location }
 }
 Start-Process -FilePath $javaExe -ArgumentList @('-jar', ('"' + $jarPath + '"')) -WorkingDirectory $serverRoot -WindowStyle Hidden -RedirectStandardOutput "$serverRoot/server.log" -RedirectStandardError "$serverRoot/server-error.log"
 Wait-LocalService 'http://127.0.0.1:8092/api/health' '账号服务'
}
if (!(Get-NetTCPConnection -LocalPort 5195 -State Listen -ErrorAction SilentlyContinue)) {
 if (!(Test-Path (Join-Path $replicaRoot 'node_modules/vite/bin/vite.js'))) {
  Push-Location $replicaRoot
  try { & npm ci; if ($LASTEXITCODE -ne 0) { throw '前端依赖安装失败。' } } finally { Pop-Location }
 }
 $nodeExe = (Get-Command node).Source
 Start-Process -FilePath $nodeExe -ArgumentList 'node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5195 --strictPort' -WorkingDirectory $replicaRoot -WindowStyle Hidden -RedirectStandardOutput "$replicaRoot/start.log" -RedirectStandardError "$replicaRoot/start-error.log"
}
Wait-LocalService 'http://127.0.0.1:5195/' '管理端'
$proxyHealth = Invoke-RestMethod 'http://127.0.0.1:5195/api/health' -TimeoutSec 5
if ($proxyHealth.service -ne 'admin-account-service') { throw '前端接口代理不正确，请检查 5195 端口。' }
Write-Host 'Preview: http://127.0.0.1:5195/'
Write-Host 'Account API: http://127.0.0.1:8092/api/health'
Write-Host 'Initial local account: admin / Admin@123456 (only on first initialization)'
