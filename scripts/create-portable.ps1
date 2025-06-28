Write-Host "Creating enhanced portable package..." -ForegroundColor Green

# Setup
$portablePath = "dist\portable"
$assetsPath = "dist\portable\assets"

# Clean and create
if (Test-Path $portablePath) { Remove-Item $portablePath -Recurse -Force }
New-Item -ItemType Directory -Path $portablePath -Force | Out-Null
New-Item -ItemType Directory -Path $assetsPath -Force | Out-Null

# Copy files
Copy-Item "dist\device-protector.exe" $portablePath -Force
Write-Host "Copied executable" -ForegroundColor Green

if (Test-Path "lock-screen.ps1") { Copy-Item "lock-screen.ps1" $portablePath -Force; Write-Host "Copied lock-screen.ps1" -ForegroundColor Green }
if (Test-Path "enterprise.jpg") { Copy-Item "enterprise.jpg" $portablePath -Force; Write-Host "Copied enterprise.jpg" -ForegroundColor Green }
if (Test-Path "input-monitor.ps1") { Copy-Item "input-monitor.ps1" $portablePath -Force; Write-Host "Copied input-monitor.ps1" -ForegroundColor Green }

if (Test-Path "src\ui\templates") { Copy-Item "src\ui\templates" $assetsPath -Recurse -Force }
if (Test-Path "src\ui\styles") { Copy-Item "src\ui\styles" $assetsPath -Recurse -Force }
if (Test-Path "src\ui\scripts") { Copy-Item "src\ui\scripts" $assetsPath -Recurse -Force }
Write-Host "Copied UI assets" -ForegroundColor Green

# Create start.bat
Set-Content -Path "$portablePath\start.bat" -Value @'
@echo off
title Sneh Creation Device Protector
echo.
echo ====================================
echo  Sneh Creation Device Protector
echo ====================================
echo.

REM Change to the directory where this batch file is located
cd /d "%~dp0"
echo Starting Device Protector from: %CD%
echo.

if exist "device-protector.exe" (
    device-protector.exe
) else (
    echo ERROR: device-protector.exe not found in %CD%
    echo Please ensure all files are extracted from the ZIP package.
    pause
)
'@

# Create improved install.bat with better error handling
Set-Content -Path "$portablePath\install.bat" -Value @'
@echo off
title Device Protector Setup
echo.
echo ====================================
echo  Device Protector Setup
echo ====================================
echo.

REM Change to the directory where this batch file is located
cd /d "%~dp0"
echo Working directory: %CD%

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Installing Device Protector...
echo.

set "INSTALL_DIR=%ProgramFiles%\SnehCreation\DeviceProtector"
echo Creating installation directory: %INSTALL_DIR%
if not exist "%ProgramFiles%\SnehCreation" mkdir "%ProgramFiles%\SnehCreation"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo.
echo Copying files from: %CD%

if exist "device-protector.exe" (
    copy "device-protector.exe" "%INSTALL_DIR%\" >nul
    echo ✓ Copied device-protector.exe
) else (
    echo ✗ device-protector.exe not found in %CD%
)

if exist "lock-screen.ps1" (
    copy "lock-screen.ps1" "%INSTALL_DIR%\" >nul
    echo ✓ Copied lock-screen.ps1
) else (
    echo - lock-screen.ps1 not found in %CD% (optional)
)

if exist "enterprise.jpg" (
    copy "enterprise.jpg" "%INSTALL_DIR%\" >nul
    echo ✓ Copied enterprise.jpg
) else (
    echo - enterprise.jpg not found in %CD% (optional)
)

if exist "input-monitor.ps1" (
    copy "input-monitor.ps1" "%INSTALL_DIR%\" >nul
    echo ✓ Copied input-monitor.ps1
) else (
    echo - input-monitor.ps1 not found in %CD% (optional)
)

if exist "assets" (
    xcopy "assets" "%INSTALL_DIR%\assets\" /E /I /Y >nul
    echo ✓ Copied UI assets
) else (
    echo - assets folder not found in %CD% (optional)
)

echo.
echo Setting up auto-startup...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "SnehDeviceProtector" /t REG_SZ /d "\"%INSTALL_DIR%\device-protector.exe\"" /f >nul 2>&1

if %errorLevel% == 0 (
    echo ✓ Added to Windows startup
) else (
    echo ✗ Failed to add to startup (check permissions)
)

echo.
echo ====================================
echo Installation completed!
echo ====================================
echo.
echo Device Protector will start automatically on system boot.
echo To uninstall, run uninstall.bat as administrator.
echo.
pause
'@

# Create improved uninstall.bat
Set-Content -Path "$portablePath\uninstall.bat" -Value @'
@echo off
title Device Protector Uninstaller
echo.
echo ====================================
echo  Device Protector Uninstaller
echo ====================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Removing Device Protector...
echo.

echo Stopping processes...
taskkill /f /im device-protector.exe >nul 2>&1
taskkill /f /im device-protector-node.exe >nul 2>&1
if %errorLevel% == 0 (
    echo ✓ Stopped running processes
) else (
    echo - No running processes found
)

echo Removing startup entry...
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "SnehDeviceProtector" /f >nul 2>&1
if %errorLevel% == 0 (
    echo ✓ Removed from Windows startup
) else (
    echo - Startup entry not found
)

echo Removing installation files...
set "INSTALL_DIR=%ProgramFiles%\SnehCreation\DeviceProtector"
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%"
    echo ✓ Removed installation directory
) else (
    echo - Installation directory not found
)

set "SNEH_DIR=%ProgramFiles%\SnehCreation"
if exist "%SNEH_DIR%" (
    rmdir "%SNEH_DIR%" >nul 2>&1
    if %errorLevel% == 0 (
        echo ✓ Removed SnehCreation directory
    ) else (
        echo - SnehCreation directory not empty (other products may exist)
    )
)

echo Cleaning registry entries...
reg delete "HKCU\SOFTWARE\SnehCreation" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\SnehCreation" /f >nul 2>&1
echo ✓ Cleaned registry entries

echo.
set /p "remove_data=Remove user settings and data? (Y/N): "
if /i "%remove_data%"=="Y" (
    echo Removing user data...
    if exist "%APPDATA%\SnehCreation" (
        rmdir /s /q "%APPDATA%\SnehCreation" >nul 2>&1
        echo ✓ Removed user data
    )
    if exist "%LOCALAPPDATA%\SnehCreation" (
        rmdir /s /q "%LOCALAPPDATA%\SnehCreation" >nul 2>&1
        echo ✓ Removed local data
    )
) else (
    echo - User data preserved
)

echo.
echo ====================================
echo Device Protector completely removed!
echo ====================================
echo.
echo Thank you for using Device Protector!
echo.
pause
'@

# Create README
Set-Content -Path "$portablePath\README.md" -Value @'
# Device Protector - Enhanced Portable Edition

## Usage Options

### Portable Mode (No Installation)
- Double-click `start.bat`
- Application runs without system installation
- Close console window to stop

### Install Mode (Permanent)
- Right-click `install.bat` > "Run as administrator"
- Installs to Program Files with auto-startup
- Use `uninstall.bat` to completely remove

## Complete Uninstall Process
1. Right-click `uninstall.bat` > "Run as administrator"
2. Removes all files, registry entries, startup items
3. Option to remove user settings and data
4. Clean removal with status feedback

## Troubleshooting Installation
- If install fails: Ensure you're running as administrator
- If files missing: Extract the full ZIP package
- If startup fails: Check Windows Defender/Antivirus

## Features
- Screen locking on inactivity
- System tray integration
- Web interface: http://localhost:3847
- Enterprise-grade security

## Files Included
- `device-protector.exe` (Main application)
- `lock-screen.ps1` (Lock screen interface)
- `enterprise.jpg` (Company logo)
- `input-monitor.ps1` (Input monitoring)
- `assets/` (UI templates, styles, scripts)

## System Requirements
- Windows 10/11 (64-bit)
- Administrator privileges (for install/uninstall only)

Version 1.0.0 Enhanced - Better Error Handling
© 2025 Sneh Creation. All rights reserved.
'@

Write-Host "Created scripts" -ForegroundColor Green

# Create ZIP
$zipPath = "dist\sneh-device-protector-portable.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$portablePath\*" -DestinationPath $zipPath -Force

$size = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "Package created: $zipPath ($size MB)" -ForegroundColor Green

Write-Host "Package contents:" -ForegroundColor Yellow
Get-ChildItem $portablePath -Recurse | ForEach-Object { 
    $name = $_.Name
    if ($_.PSIsContainer) { $name += "/" }
    Write-Host "  $name" -ForegroundColor Gray
}

Write-Host "Done!" -ForegroundColor Green