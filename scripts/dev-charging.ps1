param([int]$Port=8081)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path $PSScriptRoot -Parent
$backendRoot=Join-Path $repoRoot 'backend'
$settingsPath=Join-Path $backendRoot '.env.local'
if (!(Test-Path -LiteralPath $settingsPath)) {throw 'Copy backend/.env.example to backend/.env.local and configure the database first.'}
$allowed=@('DB_HOST','DB_PORT','DB_NAME','DB_USERNAME','DB_PASSWORD','JWT_SECRET','DEMO_ADMIN_PASSWORD','DEMO_USER_PASSWORD')
foreach ($line in [IO.File]::ReadAllLines($settingsPath)) {
 if ($line -match '^([A-Z][A-Z0-9_]*)=(.*)$' -and $allowed -contains $Matches[1]) {Set-Item -LiteralPath ('Env:'+$Matches[1]) -Value $Matches[2].Trim().Trim('"').Trim("'")}
}
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {throw "Port $Port is in use. Select another -Port; no existing service was stopped."}
Push-Location (Join-Path $backendRoot 'charging-service')
try { & mvn spring-boot:run '-Dspring-boot.run.profiles=graduation' "-Dspring-boot.run.arguments=--server.address=127.0.0.1 --server.port=$Port"; if ($LASTEXITCODE -ne 0) {throw 'Charging service failed.'} } finally { Pop-Location }
