param([switch]$Connected)
$ErrorActionPreference='Stop'
$clientRoot=Join-Path (Split-Path $PSScriptRoot -Parent) 'uni-app'
Push-Location $clientRoot
try {
 if (!(Test-Path -LiteralPath 'node_modules')) { & npm ci; if ($LASTEXITCODE -ne 0) {throw 'User client dependencies failed.'} }
 if ($Connected) { & npm run dev:connected } else { & npm run dev:h5 }
} finally { Pop-Location }
