$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'node_modules')) { npm ci; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
npm run dev:h5
