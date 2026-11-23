param([ValidateRange(1,65535)][int]$Port=8081,[string]$BackendPath='',[string]$EnvFile='',[switch]$CheckOnly)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path $PSScriptRoot -Parent
if(!$BackendPath){$BackendPath=Join-Path (Split-Path $repoRoot -Parent) 'ev-charging-platform/backend'}
$backendRoot=(Resolve-Path -LiteralPath $BackendPath).Path
if(!(Test-Path -LiteralPath (Join-Path $backendRoot 'pom.xml'))){throw 'Select ev-charging-platform/backend with -BackendPath.'}
if(!$EnvFile){$EnvFile=Join-Path $repoRoot 'backend/.env.connected.local'}
if($CheckOnly){[pscustomobject]@{BackendRoot=$backendRoot;EnvFile=$EnvFile;Profile='graduation-demo';Port=$Port};return}
if(Test-Path -LiteralPath $EnvFile){
 foreach($line in [IO.File]::ReadAllLines($EnvFile)){
  if($line -match '^([A-Z][A-Z0-9_]*)=(.*)$'){
   $key=$Matches[1];$value=$Matches[2].Trim().Trim('"').Trim("'")
   if($key -match '^(DB_|REDIS_|RABBITMQ_|SIMULATOR_|SIMULATION_|ALIPAY_)' -or $key -eq 'JWT_SECRET'){Set-Item -LiteralPath ('Env:'+$key) -Value $value}
  }
 }
}
foreach($key in @('DB_HOST','DB_NAME','DB_USERNAME','DB_PASSWORD','JWT_SECRET')){
 if([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key))){throw ('Missing '+$key+'. Copy backend/.env.connected.example to backend/.env.connected.local and configure the connected database, or set process environment variables.')}
}
if(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue){throw "Port $Port is in use. Select another -Port; no existing service was stopped."}
Push-Location $backendRoot
try{& mvn spring-boot:run '-Dspring-boot.run.profiles=graduation-demo' "-Dspring-boot.run.arguments=--server.address=127.0.0.1 --server.port=$Port";if($LASTEXITCODE -ne 0){throw 'Connected charging service failed.'}}finally{Pop-Location}
