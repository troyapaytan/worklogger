# build-installer.ps1
# Automated build pipeline for Worklogger Single Installer (Inno Setup + Bundled Node + Code Signing)
# Publisher: SMRI RPA-AI

$ErrorActionPreference = "Stop"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   Worklogger Single-Installer Build Pipeline           " -ForegroundColor Cyan
Write-Host "   Publisher: SMRI RPA-AI                               " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = $PWD.Path }
Set-Location $rootDir

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = $PWD.Path }
Set-Location $rootDir

# ---------------------------------------------------------
# Step 1: Build Frontend (Vite)
# ---------------------------------------------------------
Write-Host "`n[1/4] Building React Frontend with Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed." -ForegroundColor Red
    exit 1
}
Write-Host "Frontend build completed successfully." -ForegroundColor Green

# ---------------------------------------------------------
# Step 2: Bundle Backend Server & Prepare Build Cache
# ---------------------------------------------------------
Write-Host "`n[2/4] Bundling Express Backend..." -ForegroundColor Yellow
$cacheDir = Join-Path $rootDir "build-cache"
if (-not (Test-Path $cacheDir)) {
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
}

$serverBundle = Join-Path $cacheDir "server.cjs"
npx esbuild bin/cli.js --bundle --platform=node --target=node20 --format=cjs --outfile="$serverBundle"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Server bundling failed." -ForegroundColor Red
    exit 1
}
Write-Host "Server bundled successfully ($serverBundle)." -ForegroundColor Green

# Ensure node.exe is cached
$cachedNode = Join-Path $cacheDir "node.exe"
if (-not (Test-Path $cachedNode)) {
    Write-Host "Obtaining standalone Node.js binary..." -ForegroundColor Gray
    $localNode = (Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
    if ($localNode -and (Test-Path $localNode)) {
        Write-Host "Copying local Node.js binary ($localNode)..." -ForegroundColor Gray
        Copy-Item -Path $localNode -Destination $cachedNode -Force
    } else {
        $nodeUrl = "https://nodejs.org/dist/v22.14.0/win-x64/node.exe"
        Write-Host "Downloading standalone Node.js from $nodeUrl..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $nodeUrl -OutFile $cachedNode -UseBasicParsing
    }
}
Write-Host "Node.js binary ready ($cachedNode)." -ForegroundColor Green

# ---------------------------------------------------------
# Step 3: Create worklogger.cmd wrapper
# ---------------------------------------------------------
Write-Host "`n[3/4] Creating worklogger wrapper..." -ForegroundColor Yellow
$wrapperPath = Join-Path $cacheDir "worklogger.cmd"
$wrapperContent = @"
@echo off
`"%~dp0node.exe`" `"%~dp0server.cjs`" %*
"@
Set-Content -Path $wrapperPath -Value $wrapperContent
Write-Host "Created worklogger.cmd ($wrapperPath)." -ForegroundColor Green

# ---------------------------------------------------------
# Step 4: Package into ZIP
# ---------------------------------------------------------
Write-Host "`n[4/4] Packaging into WORKLOGGER.zip..." -ForegroundColor Yellow

$distInstallerDir = Join-Path $rootDir "dist-installer"
if (-not (Test-Path $distInstallerDir)) {
    New-Item -ItemType Directory -Path $distInstallerDir -Force | Out-Null
}

$zipPath = Join-Path $distInstallerDir "WORKLOGGER.zip"
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

# Create a temporary staging directory to zip everything neatly
$stagingDir = Join-Path $rootDir "staging-zip"
if (Test-Path $stagingDir) { Remove-Item -Path $stagingDir -Recurse -Force }
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

# Copy frontend
$distDir = Join-Path $rootDir "dist"
if (Test-Path $distDir) {
    Copy-Item -Path $distDir -Destination (Join-Path $stagingDir "dist") -Recurse -Force
}

# Copy backend, node, wrapper
Copy-Item -Path (Join-Path $cacheDir "server.cjs") -Destination $stagingDir -Force
Copy-Item -Path (Join-Path $cacheDir "node.exe") -Destination $stagingDir -Force
Copy-Item -Path $wrapperPath -Destination $stagingDir -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem

$maxRetries = 3
$retryCount = 0
$success = $false

while (-not $success -and $retryCount -lt $maxRetries) {
    try {
        [System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $zipPath)
        $success = $true
    } catch {
        $retryCount++
        Write-Host "File lock detected. Retrying in 2 seconds... ($retryCount/$maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        if ($retryCount -eq $maxRetries) {
            Write-Host "Failed to create archive after $maxRetries attempts." -ForegroundColor Red
            throw $_
        }
    }
}

# Clean up staging
Remove-Item -Path $stagingDir -Recurse -Force

$zipSizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "               BUILD ARTIFACTS CREATED                  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Package   : $zipPath ($zipSizeMB MB)" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Cyan

