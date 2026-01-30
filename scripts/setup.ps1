param()

$repoName = "EasyfinderAI1.0"
$repoUrl = "https://github.com/whattemup/EasyfinderAI1.0.git"

if (-not (Test-Path $repoName)) {
  New-Item -ItemType Directory -Path $repoName | Out-Null
}
Set-Location $repoName

if (-not (Test-Path .git)) {
  git init
  git checkout -b main
}

git remote remove origin 2-gt$null
if (-not (git remote get-url origin 2-gt$null)) {
  git remote add origin $repoUrl
}

git add -A
if (-not (git rev-parse HEAD 2-gt$null)) {
  git commit -m "Initial commit"
}

git push -u origin main

if (Get-Command code -ErrorAction SilentlyContinue) {
  code .
}

Write-Host "Setup complete. If push failed, authenticate with GitHub and re-run git push -u origin main."