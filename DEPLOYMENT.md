# Device Protector - Portable Deployment Guide

## 🚀 Quick Setup

### For Development Machine (One-time setup):

1. **Install Bun** (if not already installed):
   ```powershell
   irm bun.sh/install.ps1 | iex
   ```

2. **Install Dependencies**:
   ```powershell
   bun install
   ```

3. **Build Portable Version**:
   ```powershell
   # Option 1: Full build and package
   .\build.ps1
   
   # Option 2: Individual steps
   bun run build
   bun run package:portable
   ```

### For Target Machines (No dependencies needed):

1. **Copy the portable package** to target machine
2. **Extract** `sneh-device-protector-portable.zip`
3. **Choose deployment method**:

   #### Method A: Portable Mode (No installation)
   - Double-click `start.bat`
   - App runs without installing anything
   - Perfect for testing or temporary use

   #### Method B: Permanent Installation
   - Right-click `install.bat` → "Run as administrator"
   - Installs to Program Files
   - Adds to Windows startup
   - Use `uninstall.bat` to remove

## 📁 Package Contents

```
sneh-device-protector-portable/
├── device-protector.exe     # Main executable (all dependencies bundled)
├── start.bat               # Portable launcher
├── install.bat             # System installer (requires admin)
├── uninstall.bat           # System uninstaller (requires admin)
├── README.md               # User instructions
├── assets/                 # UI files (HTML, CSS, JS)
│   ├── templates/
│   ├── styles/
│   └── scripts/
├── *.ps1                   # PowerShell helper scripts
└── config/                 # Created on first run (portable mode)
```

## 🎯 Deployment Scenarios

### Scenario 1: IT Department Mass Deployment
1. Build once on development machine
2. Copy `device-protector.exe` to network share
3. Use Group Policy or deployment tool to run installer
4. Configure via web interface (port 3847)

### Scenario 2: Standalone Workstation
1. Extract portable package
2. Run `install.bat` as administrator
3. Configure via system tray or web interface

### Scenario 3: Testing/Demo
1. Extract portable package
2. Run `start.bat`
3. No system changes, easy cleanup

## ✅ Verification Steps

After deployment, verify:
- [ ] Executable runs without errors
- [ ] Web interface accessible at `http://localhost:3847`
- [ ] System tray icon appears
- [ ] Screen locking works on inactivity
- [ ] Input monitoring active

## 🔧 Troubleshooting

### Common Issues:

1. **"Application failed to start"**
   - Ensure Windows 10/11 x64
   - Check Windows Defender/Antivirus
   - Run as administrator

2. **"Port already in use"**
   - Another instance is running
   - Kill process: `taskkill /f /im device-protector.exe`

3. **"System tray not showing"**
   - Check Windows notification settings
   - Ensure explorer.exe is running

### Debug Mode:
```powershell
# Run with verbose logging
.\device-protector.exe --debug
```

## 📊 Technical Details

- **Runtime**: Bun (embedded, no external dependencies)
- **Size**: ~50MB (includes all dependencies)
- **Platform**: Windows 10/11 x64
- **Port**: 3847 (configurable)
- **Config Location**: 
  - Portable: `./config/`
  - Installed: `%APPDATA%/SnehCreation/`

## 🔒 Security Notes

- Requires elevated privileges for some features
- Creates firewall exception for web interface
- Stores configuration in encrypted format
- Auto-update capability (can be disabled)

---

## 🏗️ Build Options Summary

| Command | Purpose | Output |
|---------|---------|---------|
| `bun run build` | Bun executable | `dist/device-protector.exe` |
| `bun run build:node` | Node.js fallback | `dist/device-protector-node.exe` |
| `bun run build:portable` | Full package | `dist/sneh-device-protector-portable.zip` |
| `.\build.ps1` | Complete build | All above + scripts |

Choose the method that best fits your deployment needs!
