param([switch]$Connected,[switch]$CheckOnly)
$ErrorActionPreference='Stop'
$clientRoot=Join-Path (Split-Path $PSScriptRoot -Parent) 'mobile-client'
$command=if($Connected){'dev:connected'}else{'dev:h5'}
if($CheckOnly){[pscustomobject]@{ClientRoot=$clientRoot;Command=$command};return}
Push-Location $clientRoot
try{
 if(!(Test-Path -LiteralPath 'node_modules')){& npm ci;if($LASTEXITCODE -ne 0){throw 'User client dependencies failed.'}}
 & npm run $command;if($LASTEXITCODE -ne 0){throw 'User client failed.'}
}finally{Pop-Location}
