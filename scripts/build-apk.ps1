# Stage the game and build a debug APK.
# JDK and Android SDK live under %LOCALAPPDATA%\amh-android (shared with Maid Haven).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $env:LOCALAPPDATA 'amh-android'
$env:JAVA_HOME = Join-Path $tools 'jdk'
$env:ANDROID_HOME = Join-Path $tools 'sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$(Join-Path $env:JAVA_HOME 'bin');$(Join-Path $env:ANDROID_HOME 'platform-tools');$env:Path"

if (-not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  throw "JDK not found at $env:JAVA_HOME"
}

& (Join-Path $PSScriptRoot 'stage-apk.ps1')

$npx = 'C:\Program Files\nodejs\npx.cmd'
Push-Location $root
try {
  & $npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw "cap sync failed ($LASTEXITCODE)" }
} finally {
  Pop-Location
}

$propsDir = Join-Path $root 'android'
$escaped = $env:ANDROID_HOME.Replace('\', '\\')
[System.IO.File]::WriteAllText((Join-Path $propsDir 'local.properties'), "sdk.dir=$escaped`r`n")

$gradleProps = Join-Path $propsDir 'gradle.properties'
if (Test-Path $gradleProps) {
  $gp = [System.IO.File]::ReadAllText($gradleProps)
  $gp2 = [regex]::Replace($gp, 'org\.gradle\.jvmargs=.*', 'org.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8')
  if ($gp2 -eq $gp -and $gp -notmatch 'org\.gradle\.jvmargs=') {
    $gp2 = $gp.TrimEnd() + "`r`norg.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8`r`n"
  }
  [System.IO.File]::WriteAllText($gradleProps, $gp2)
}

Push-Location $propsDir
try {
  & .\gradlew.bat assembleDebug --no-daemon
  if ($LASTEXITCODE -ne 0) { throw "gradle assembleDebug failed ($LASTEXITCODE)" }
} finally {
  Pop-Location
}

$apk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) { throw "APK missing: $apk" }
Copy-Item $apk (Join-Path $root 'alien-survivor-debug.apk') -Force
$item = Get-Item (Join-Path $root 'alien-survivor-debug.apk')
Write-Host ("APK {0} ({1:N1} MB)" -f $item.FullName, ($item.Length / 1MB))
