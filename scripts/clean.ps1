param()

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Remove-Target {
  param(
    [string]$PathToRemove
  )

  if (Test-Path $PathToRemove) {
    Remove-Item -Path $PathToRemove -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed: $PathToRemove"
  }
}

Remove-Target ".\node_modules"
Remove-Target ".\.turbo"
Remove-Target ".\coverage"

if (Test-Path ".\apps") {
  Get-ChildItem -Path ".\apps" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Target (Join-Path $_.FullName "node_modules")
    Remove-Target (Join-Path $_.FullName "dist")
    Remove-Target (Join-Path $_.FullName "build")
    Remove-Target (Join-Path $_.FullName ".vite")
  }
}

if (Test-Path ".\packages") {
  Get-ChildItem -Path ".\packages" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Target (Join-Path $_.FullName "node_modules")
    Remove-Target (Join-Path $_.FullName "dist")
  }
}
