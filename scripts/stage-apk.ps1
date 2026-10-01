# Copy the game into www/ and mark it as the Android shell.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$www = Join-Path $root 'www'
if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Path $www | Out-Null

Copy-Item (Join-Path $root 'index.html') (Join-Path $www 'index.html')
Copy-Item (Join-Path $root 'css') (Join-Path $www 'css') -Recurse
Copy-Item (Join-Path $root 'js') (Join-Path $www 'js') -Recurse
Copy-Item (Join-Path $root 'assets') (Join-Path $www 'assets') -Recurse
if (Test-Path (Join-Path $root 'pack.zip')) {
  Copy-Item (Join-Path $root 'pack.zip') (Join-Path $www 'pack.zip')
}
Copy-Item (Join-Path $PSScriptRoot 'android-apk.js') (Join-Path $www 'js\android-apk.js')

$indexPath = Join-Path $www 'index.html'
$index = [System.IO.File]::ReadAllText($indexPath)
$index = $index.Replace(
  '<head>',
  "<head>`r`n<script>document.documentElement.classList.add('android-apk');</script>"
)
$index = $index.Replace(
  '<script src="js/main.js?v=34"></script>',
  "<script src=`"js/main.js?v=34`"></script>`r`n<script src=`"js/android-apk.js`"></script>"
)
if ($index -notmatch 'android-apk') { throw 'Could not mark the staged page as the Android app.' }
[System.IO.File]::WriteAllText($indexPath, $index)
Write-Host "Staged $www"
