#!/usr/bin/env powershell

# Device Protector Build and Package Script
param(
    [switch]$Clean,
    [switch]$BuildOnly,
    [switch]$PackageOnly
)

Write-Host ""
Write-Host "🏗️  Sneh Creation Device Protector Builder" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Clean previous builds
if ($Clean -or !$PackageOnly) {
    Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
    if (Test-Path "dist") {
        Remove-Item "dist" -Recurse -Force
    }
    New-Item -ItemType Directory -Path "dist" -Force | Out-Null
}

# Build executable
if (!$PackageOnly) {
    Write-Host "🔨 Building executable..." -ForegroundColor Yellow
    
    # Install dependencies first if node_modules doesn't exist
    if (!(Test-Path "node_modules")) {
        Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
        & bun install
    }
    
    # Build the executable
    $buildCommand = "bun build src/main.js --compile --outfile=dist/device-protector.exe --target=bun-windows-x64"
    Write-Host "Running: $buildCommand" -ForegroundColor Gray
    
    Invoke-Expression $buildCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
}

# Package for distribution
if (!$BuildOnly) {
    Write-Host "📦 Creating portable package..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File "scripts/create-portable.ps1"
}

Write-Host ""
Write-Host "🎉 All done! Your portable Device Protector is ready." -ForegroundColor Green
Write-Host ""
Write-Host "📁 Files created:" -ForegroundColor Cyan
Write-Host "   • dist/device-protector.exe (standalone executable)"
Write-Host "   • dist/sneh-device-protector-portable.zip (portable package)"
Write-Host ""
Write-Host "🚀 Deployment options:" -ForegroundColor Yellow
Write-Host "   1. Copy just the .exe file for basic usage"
Write-Host "   2. Extract the .zip file for full portable experience"
Write-Host "   3. Use install.bat for permanent system installation"
Write-Host ""
