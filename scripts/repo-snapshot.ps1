[CmdletBinding()]
param(
  [switch]$CreateArchive
)

$ErrorActionPreference = "Stop"

function Test-ExcludedPath {
  param(
    [Parameter(Mandatory = $true)][string]$RelativePath
  )

  $normalized = $RelativePath.Replace('\\', '/').TrimStart('./')
  if ([string]::IsNullOrWhiteSpace($normalized)) { return $false }

  $excludedDirectories = @(
    'node_modules/',
    '.turbo/',
    'dist/',
    'coverage/',
    '.git/'
  )

  foreach ($prefix in $excludedDirectories) {
    if ($normalized.StartsWith($prefix) -or $normalized.Contains('/' + $prefix)) {
      return $true
    }
  }

  $name = [System.IO.Path]::GetFileName($normalized)
  if ($name -like '.env*') { return $true }
  if ($name -like '*.tsbuildinfo') { return $true }

  return $false
}

function Get-RelativePath {
  param(
    [Parameter(Mandatory = $true)][string]$BasePath,
    [Parameter(Mandatory = $true)][string]$TargetPath
  )

  # Normalize to full paths
  $baseFull = (Resolve-Path -LiteralPath $BasePath).Path
  $targetFull = (Resolve-Path -LiteralPath $TargetPath).Path

  # Ensure base ends with a trailing slash for MakeRelativeUri correctness
  if (-not $baseFull.EndsWith('\\')) { $baseFull += '\\' }

  $baseUri = [Uri]("file:///" + ($baseFull -replace '\\', '/'))
  $targetUri = [Uri]("file:///" + ($targetFull -replace '\\', '/'))

  $rel = $baseUri.MakeRelativeUri($targetUri).ToString()
  $rel = [Uri]::UnescapeDataString($rel) -replace '/', '\\'

  return $rel
}

function Add-FileContentSection {
  param(
    [System.Text.StringBuilder]$Builder,
    [string]$Root,
    [string]$Path,
    [int]$MaxLines = 400
  )

  $fullPath = Join-Path $Root $Path
  [void]$Builder.AppendLine("## File: $Path")

  if (-not (Test-Path -LiteralPath $fullPath)) {
    [void]$Builder.AppendLine('_Not found._')
    [void]$Builder.AppendLine()
    return
  }

  $lines = Get-Content -LiteralPath $fullPath -ErrorAction Stop
  $lineCount = $lines.Count
  $slice = $lines | Select-Object -First $MaxLines

  [void]$Builder.AppendLine('```')
  foreach ($line in $slice) {
    [void]$Builder.AppendLine($line)
  }
  if ($lineCount -gt $MaxLines) {
    [void]$Builder.AppendLine("... (truncated to first $MaxLines of $lineCount lines)")
  }
  [void]$Builder.AppendLine('```')
  [void]$Builder.AppendLine()
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

$docsDir = Join-Path $repoRoot 'docs'
if (-not (Test-Path -LiteralPath $docsDir)) {
  New-Item -ItemType Directory -Path $docsDir | Out-Null
}

$timestampUtc = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$commitHash = (git rev-parse HEAD).Trim()

$trackedFiles = @(git ls-files)
$filteredTracked = $trackedFiles |
  ForEach-Object { $_.Trim() } |
  Where-Object { $_ -and -not (Test-ExcludedPath -RelativePath $_) } |
  Sort-Object -Unique

$fileIndex = @()
foreach ($path in $filteredTracked) {
  $fullPath = Join-Path $repoRoot $path
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    continue
  }

  $item = Get-Item -LiteralPath $fullPath
  $fileIndex += [PSCustomObject]@{
    path        = $path.Replace('\\', '/')
    bytes       = [int64]$item.Length
    modifiedUtc = $item.LastWriteTimeUtc.ToString('yyyy-MM-ddTHH:mm:ssZ')
  }
}

$fileIndexPath = Join-Path $docsDir 'FILE_INDEX.json'
$fileIndex | Sort-Object path | ConvertTo-Json -Depth 4 | Out-File -LiteralPath $fileIndexPath -Encoding utf8

$treeItems = Get-ChildItem -LiteralPath $repoRoot -Recurse -Force |
  Where-Object {
    $relative = Get-RelativePath -BasePath $repoRoot -TargetPath $_.FullName
    -not (Test-ExcludedPath -RelativePath $relative)
  } |
  Where-Object {
    (Get-RelativePath -BasePath $repoRoot -TargetPath $_.FullName).Split('/').Count -le 6
  } |
  ForEach-Object {
    $relative = Get-RelativePath -BasePath $repoRoot -TargetPath $_.FullName
    [PSCustomObject]@{
      path  = $relative
      depth = [Math]::Max($relative.Split('/').Count - 1, 0)
      isDir = $_.PSIsContainer
    }
  } |
  Sort-Object path

$routeMatches = Select-String -Path (Join-Path $repoRoot 'apps/web/src/App.tsx') -Pattern 'path="([^"]+)"' -AllMatches -ErrorAction SilentlyContinue
$routes = @()
foreach ($matchGroup in $routeMatches.Matches) {
  $routes += $matchGroup.Groups[1].Value
}
$routes = $routes | Sort-Object -Unique

$pageFiles = Get-ChildItem -Path (Join-Path $repoRoot 'apps/web/src/pages') -Recurse -File -Include *.tsx,*.ts -ErrorAction SilentlyContinue |
  ForEach-Object { Get-RelativePath -BasePath $repoRoot -TargetPath $_.FullName } |
  Sort-Object -Unique

$componentFiles = Get-ChildItem -Path (Join-Path $repoRoot 'apps/web/src/components') -Recurse -File -Include *.tsx,*.ts -ErrorAction SilentlyContinue |
  ForEach-Object { Get-RelativePath -BasePath $repoRoot -TargetPath $_.FullName } |
  Sort-Object -Unique

$apiRouteFiles = Get-ChildItem -Path (Join-Path $repoRoot 'apps/api/src/routes') -Recurse -File -Include *.ts -ErrorAction SilentlyContinue |
  ForEach-Object { Get-RelativePath -BasePath $repoRoot -TargetPath $_.FullName } |
  Sort-Object -Unique

$workspacePackageFiles = @(
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/shared/package.json'
)

$builder = New-Object System.Text.StringBuilder
[void]$builder.AppendLine('# EasyFinder Repo Snapshot')
[void]$builder.AppendLine()
[void]$builder.AppendLine("- Generated (UTC): $timestampUtc")
[void]$builder.AppendLine("- Commit: $commitHash")
[void]$builder.AppendLine("- File index records: $($fileIndex.Count)")
[void]$builder.AppendLine()

[void]$builder.AppendLine('## Filtered tree (depth <= 6)')
[void]$builder.AppendLine('```text')
foreach ($item in $treeItems) {
  $indent = '  ' * $item.depth
  $suffix = if ($item.isDir) { '/' } else { '' }
  [void]$builder.AppendLine("$indent$($item.path)$suffix")
}
[void]$builder.AppendLine('```')
[void]$builder.AppendLine()

[void]$builder.AppendLine('## Workspace package summaries')
foreach ($pkgPath in $workspacePackageFiles) {
  $fullPkgPath = Join-Path $repoRoot $pkgPath
  [void]$builder.AppendLine("### $pkgPath")
  if (-not (Test-Path -LiteralPath $fullPkgPath)) {
    [void]$builder.AppendLine('_Not found._')
    [void]$builder.AppendLine()
    continue
  }

  $pkg = Get-Content -LiteralPath $fullPkgPath -Raw | ConvertFrom-Json
  [void]$builder.AppendLine("- Name: $($pkg.name)")
  [void]$builder.AppendLine("- Version: $($pkg.version)")
  [void]$builder.AppendLine('- Scripts:')
  if ($pkg.scripts) {
    $scriptProps = $pkg.scripts.PSObject.Properties | Sort-Object Name
    foreach ($script in $scriptProps) {
      [void]$builder.AppendLine("  - $($script.Name): $($script.Value)")
    }
  } else {
    [void]$builder.AppendLine('  - (none)')
  }

  [void]$builder.AppendLine('- Dependencies:')
  if ($pkg.dependencies) {
    $depProps = $pkg.dependencies.PSObject.Properties | Sort-Object Name
    foreach ($dep in $depProps) {
      [void]$builder.AppendLine("  - $($dep.Name): $($dep.Value)")
    }
  } else {
    [void]$builder.AppendLine('  - (none)')
  }

  [void]$builder.AppendLine('- DevDependencies:')
  if ($pkg.devDependencies) {
    $devDepProps = $pkg.devDependencies.PSObject.Properties | Sort-Object Name
    foreach ($dep in $devDepProps) {
      [void]$builder.AppendLine("  - $($dep.Name): $($dep.Value)")
    }
  } else {
    [void]$builder.AppendLine('  - (none)')
  }

  [void]$builder.AppendLine()
}

[void]$builder.AppendLine('## Routes/pages/components (best effort)')
[void]$builder.AppendLine('### Routes from apps/web/src/App.tsx')
foreach ($route in $routes) {
  [void]$builder.AppendLine("- $route")
}
[void]$builder.AppendLine()

[void]$builder.AppendLine('### Page files')
foreach ($page in $pageFiles) {
  [void]$builder.AppendLine("- $page")
}
[void]$builder.AppendLine()

[void]$builder.AppendLine('### Component files')
foreach ($component in $componentFiles) {
  [void]$builder.AppendLine("- $component")
}
[void]$builder.AppendLine()

[void]$builder.AppendLine('### API route files')
foreach ($apiRoute in $apiRouteFiles) {
  [void]$builder.AppendLine("- $apiRoute")
}
[void]$builder.AppendLine()

$contextFiles = @(
  'package.json',
  'pnpm-workspace.yaml',
  'turbo.json',
  'openapi.yml',
  'README.md',
  '.easyfinder-context.md'
)

[void]$builder.AppendLine('## Key file contents')
[void]$builder.AppendLine()
foreach ($contextFile in $contextFiles) {
  Add-FileContentSection -Builder $builder -Root $repoRoot -Path $contextFile
}

$snapshotPath = Join-Path $docsDir 'REPO_SNAPSHOT.md'
$builder.ToString() | Out-File -LiteralPath $snapshotPath -Encoding utf8

if ($CreateArchive) {
  $archivePath = Join-Path $repoRoot 'easyfinder-snapshot.tar.gz'
  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }

  $archiveCandidates = @(
    'docs/REPO_SNAPSHOT.md',
    'docs/FILE_INDEX.json',
    'openapi.yml',
    'README.md',
    '.easyfinder-context.md'
  )

  if (Test-Path -LiteralPath (Join-Path $repoRoot 'project docs')) {
    $projectDocsFiles = Get-ChildItem -Path (Join-Path $repoRoot 'project docs') -Recurse -File |
      ForEach-Object { Get-RelativePath -BasePath $repoRoot -TargetPath $_.FullName }
    $archiveCandidates += $projectDocsFiles
  }

  $archiveItems = $archiveCandidates |
    Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $repoRoot $_)) } |
    Sort-Object -Unique

  if ($archiveItems.Count -gt 0) {
    $tarArgs = @('-czf', 'easyfinder-snapshot.tar.gz') + $archiveItems
    & tar @tarArgs
  }
}

Write-Host "Snapshot written to docs/REPO_SNAPSHOT.md and docs/FILE_INDEX.json"
if ($CreateArchive) {
  Write-Host 'Archive written to easyfinder-snapshot.tar.gz'
}
