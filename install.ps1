# install.ps1
# Installer script for Worklogger
# This script will check for Node.js, extract WORKLOGGER.zip to the local system, and install the worklogger CLI globally.

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "    Worklogger Installer                      " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Path Setup
Write-Host "`n[1/3] Checking environment..." -ForegroundColor Yellow

# 2. Extract WORKLOGGER.zip
Write-Host "`n[2/3] Locating and extracting WORKLOGGER.zip..." -ForegroundColor Yellow

$zipPath = $null
$tempZipDownloaded = $false

# Check if a custom source URL or path was passed via $BaseUrl, $SourceUrl, or environment variable
$sourceCandidate = $BaseUrl
if (-not $sourceCandidate) { $sourceCandidate = $SourceUrl }
if (-not $sourceCandidate) { $sourceCandidate = $env:WORKLOGGER_SOURCE_URL }

# 2.1 Check if running locally or via script file
if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot) -and (Test-Path (Join-Path $PSScriptRoot "WORKLOGGER.zip"))) {
    $zipPath = Join-Path $PSScriptRoot "WORKLOGGER.zip"
} elseif (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    $anyZip = Get-ChildItem -Path $PSScriptRoot -Filter "*.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($anyZip) {
        $zipPath = $anyZip.FullName
    }
}

# 2.2 Check current working directory if invoked via iex
if (-not $zipPath -and (Test-Path (Join-Path $PWD.Path "WORKLOGGER.zip"))) {
    $zipPath = Join-Path $PWD.Path "WORKLOGGER.zip"
}

# 2.3 If source URL/path candidate is provided (e.g. $BaseUrl = "http://...")
if (-not $zipPath -and $sourceCandidate) {
    if ($sourceCandidate -match '^https?://') {
        $zipUrl = if ($sourceCandidate.EndsWith('.zip', [System.StringComparison]::OrdinalIgnoreCase)) {
            $sourceCandidate
        } else {
            $sourceCandidate.TrimEnd('/') + '/WORKLOGGER.zip'
        }
        $tempZipPath = Join-Path $env:TEMP "WORKLOGGER.zip"
        Write-Host "Downloading WORKLOGGER.zip from $zipUrl..." -ForegroundColor Gray
        try {
            Invoke-WebRequest -Uri $zipUrl -OutFile $tempZipPath -UseBasicParsing
            $zipPath = $tempZipPath
            $tempZipDownloaded = $true
            Write-Host "Download complete." -ForegroundColor Green
        } catch {
            Write-Host "Failed to download WORKLOGGER.zip from $zipUrl. Error: $_" -ForegroundColor Red
        }
    } elseif (Test-Path $sourceCandidate) {
        if ((Get-Item $sourceCandidate) -is [System.IO.DirectoryInfo]) {
            $zipPath = Join-Path $sourceCandidate "WORKLOGGER.zip"
        } else {
            $zipPath = $sourceCandidate
        }
    }
}

# 2.4 If still not found (e.g., piped via `irm ... | iex` without $BaseUrl)
if (-not $zipPath -or -not (Test-Path $zipPath)) {
    Write-Host "WORKLOGGER.zip not found in current directory." -ForegroundColor Yellow
    $userInput = Read-Host "Please enter the URL or shared folder path containing WORKLOGGER.zip"
    if ($userInput -match '^https?://') {
        $zipUrl = if ($userInput.EndsWith('.zip', [System.StringComparison]::OrdinalIgnoreCase)) {
            $userInput
        } else {
            $userInput.TrimEnd('/') + '/WORKLOGGER.zip'
        }
        $tempZipPath = Join-Path $env:TEMP "WORKLOGGER.zip"
        Write-Host "Downloading WORKLOGGER.zip from $zipUrl..." -ForegroundColor Gray
        try {
            Invoke-WebRequest -Uri $zipUrl -OutFile $tempZipPath -UseBasicParsing
            $zipPath = $tempZipPath
            $tempZipDownloaded = $true
            Write-Host "Download complete." -ForegroundColor Green
        } catch {
            Write-Host "Failed to download WORKLOGGER.zip from $zipUrl. Error: $_" -ForegroundColor Red
            Pause
            exit 1
        }
    } elseif (Test-Path $userInput) {
        if ((Get-Item $userInput) -is [System.IO.DirectoryInfo]) {
            $zipPath = Join-Path $userInput "WORKLOGGER.zip"
        } else {
            $zipPath = $userInput
        }
    } else {
        Write-Host "Error: Unable to locate WORKLOGGER.zip at '$userInput'" -ForegroundColor Red
        Pause
        exit 1
    }
}

Write-Host "Found archive: $zipPath" -ForegroundColor Gray

$installDir = Join-Path $env:LOCALAPPDATA "Programs\Worklogger"
Write-Host "Target directory: $installDir" -ForegroundColor Gray

if (Test-Path $installDir) {
    Write-Host "Removing existing installation files..." -ForegroundColor Gray
    Remove-Item -Path $installDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $installDir -Force | Out-Null

Write-Host "Extracting archive..." -ForegroundColor Gray
try {
    Expand-Archive -Path $zipPath -DestinationPath $installDir -Force
    Write-Host "Extraction completed." -ForegroundColor Green
} catch {
    Write-Host "Failed to extract $zipPath. Error: $_" -ForegroundColor Red
    Pause
    exit 1
}

# Clean up temp downloaded zip if applicable
if ($tempZipDownloaded -and (Test-Path $zipPath)) {
    Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
}

# 3. Cleanup Old Global Installation
Write-Host "`n[3/4] Cleaning up old global installations..." -ForegroundColor Yellow
$oldNpmCmd = Join-Path $env:APPDATA "npm\worklogger.cmd"
$oldNpmCmdPs1 = Join-Path $env:APPDATA "npm\worklogger.ps1"
$oldNpmCmdFile = Join-Path $env:APPDATA "npm\worklogger"

if (Test-Path $oldNpmCmd) { Remove-Item -Path $oldNpmCmd -Force -ErrorAction SilentlyContinue }
if (Test-Path $oldNpmCmdPs1) { Remove-Item -Path $oldNpmCmdPs1 -Force -ErrorAction SilentlyContinue }
if (Test-Path $oldNpmCmdFile) { Remove-Item -Path $oldNpmCmdFile -Force -ErrorAction SilentlyContinue }

if (Get-Command npm -ErrorAction SilentlyContinue) {
    try {
        npm uninstall -g worklogger --silent 2>$null
    } catch {}
}

# 4. Setup Path
Write-Host "`n[4/4] Setting up environment variables..." -ForegroundColor Yellow

$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$installDirAdded = $false

if (-not ($userPath -split ';' -contains $installDir)) {
    $newPath = $userPath + ";" + $installDir
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    
    # Update for current session as well
    $env:PATH = $env:PATH + ";" + $installDir
    $installDirAdded = $true
    Write-Host "Added $installDir to User PATH." -ForegroundColor Green
} else {
    Write-Host "$installDir is already in User PATH." -ForegroundColor Green
}

Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "You can now run Worklogger from any terminal by typing:" -ForegroundColor Cyan
Write-Host "worklogger" -ForegroundColor White
Write-Host "==============================================`n" -ForegroundColor Cyan

Pause
