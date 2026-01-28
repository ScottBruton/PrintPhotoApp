# 📸 PrintPhotoApp

A professional Windows desktop application for designing and printing photo layouts on A4 paper.

## ✨ Features

- 🎨 **Custom Photo Layouts** - Design layouts with multiple photo sizes on A4 pages
- 📐 **Flexible Sizing** - Choose from preset sizes or create custom dimensions
- 🖼️ **Image Editing** - Zoom, rotate, and position photos perfectly
- 📄 **Multi-Page Support** - Create layouts across multiple pages
- 💾 **Save & Load** - Save your layouts as JSON and reload them anytime
- 🖨️ **Windows Printing** - Print directly to physical printers with quality control
- 📁 **PDF Export** - Export layouts to PDF for sharing or archiving
- ⬆️ **Auto-Updates** - Get notified when new versions are available
- ↩️ **Undo/Redo** - Full history with 50-step undo/redo support

## 🚀 Quick Start

### **Prerequisites**

- **Windows** 10 or later (required for printer functionality)
- **Node.js** v18 or later
- **Python** 3.11 or later

### **Installation (Development)**

```bash
# 1. Clone the repository
git clone https://github.com/ScottBruton/PrintPhotoApp.git
cd PrintPhotoApp

# 2. Install Node.js dependencies
npm install

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start the app in development mode
npm run dev
```

### **Available Commands**

```bash
npm start           # Start app (basic)
npm run dev         # Start with auto-reload (recommended)
npm run dev-reload  # Start with hot-reload (for UI work)
npm run build       # Build production installer
```

## 📦 Creating Releases

See **[RELEASE.md](./RELEASE.md)** for complete release and auto-update documentation.

**Quick Release:**

```bash
# 1. Update version in package.json
# 2. Commit and tag
git add package.json
git commit -m "Release v1.0.4"
git tag v1.0.4
git push origin main
git push origin v1.0.4

# 3. GitHub Actions builds automatically!
# 4. Users get notified in-app
```

## 🏗️ Project Structure

```
PrintPhotoApp/
├── main.js              # Main Electron process
├── renderer.js          # Main UI logic & state management
├── preload.js           # IPC bridge (security)
├── layoutRenderer.js    # Layout HTML generation
├── printing.js          # Print manager & dialog
├── printPreview.js      # Print preview UI
├── print_handler.py     # Windows printer integration
├── updateHandler/       # Auto-update system
│   ├── update.js        # Update logic
│   ├── update.html      # Update UI
│   └── preload.js       # Update IPC bridge
├── .github/workflows/   # CI/CD automation
│   └── release.yml      # Build & release workflow
├── asset/               # Icons and images
├── temp/                # Temporary files
└── dist/                # Build output (gitignored)
```

## 🛠️ Technology Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Desktop**: Electron 28
- **Build**: electron-builder
- **Updates**: electron-updater
- **PDF**: jsPDF, html2canvas
- **Logging**: electron-log
- **Python**: pywin32 (Windows printer API)

## 🔧 Development

### **Running in Development**

```bash
npm run dev
```

This starts the app with automatic restart on file changes (nodemon).

**Features in Dev Mode:**
- ✅ Auto-reload on changes
- ✅ Console logging enabled
- ❌ Auto-updates disabled (production only)

### **Building Production Installer**

```bash
npm run build
```

Output: `dist/PrintPhotoApp-Setup-X.X.X.exe`

### **Testing Updates**

1. Build and install current version
2. Bump version in `package.json`
3. Create release (see RELEASE.md)
4. Launch installed app
5. Wait 5 seconds → Update banner appears!

## 🖨️ Printing Features

### **Supported Features:**

- ✅ Multiple printer selection
- ✅ Real-time printer status monitoring
- ✅ Print quality settings (150/300/600 DPI)
- ✅ Paper type selection (plain/glossy/photo)
- ✅ Portrait/landscape orientation
- ✅ Custom page ranges
- ✅ Print preview with zoom

### **Supported Printers:**

- Physical printers (via Windows print API)
- Virtual printers (Microsoft Print to PDF, etc.)
- Network printers

## 📐 Photo Sizes

### **Preset Sizes:**

**Small (Wallet/Compact):**
- 51×51mm Square
- 64×89mm / 89×64mm
- 89×127mm / 127×89mm

**Common:**
- 102×152mm / 152×102mm (4×6")
- 127×178mm / 178×127mm (5×7")
- 152×203mm / 203×152mm (6×8")

**Large:**
- 203×254mm / 254×203mm (8×10")

**Custom:**
- Any size from 1mm to A4 dimensions

## ⬆️ Auto-Update System

The app automatically checks for updates 5 seconds after launch (production only).

**User Experience:**
1. Banner appears at top: "Version X.X.X Available"
2. User clicks "Download" → Progress bar shows
3. User clicks "Install & Restart" → App updates automatically
4. App relaunches with new version ✅

**No manual downloads needed!**

## 🔐 Code Signing (Optional)

Currently configured for **unsigned** builds (fine for personal use).

For production deployment, see **[RELEASE.md](./RELEASE.md#code-signing-optional-but-recommended)** for code signing setup.

**With Code Signing:**
- ✅ No Windows SmartScreen warnings
- ✅ Shows your company name
- ✅ Professional appearance

## 📝 License

ISC License - See LICENSE file for details

## 👤 Author

Scott Bruton

## 🐛 Troubleshooting

### **App won't start**

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm run dev
```

### **Updates not working**

Check logs: `%TEMP%\PrintPhotoApp-updates.log`

See [RELEASE.md - Troubleshooting](./RELEASE.md#troubleshooting) for detailed solutions.

### **Printer not detected**

1. Ensure printer is powered on and connected
2. Check printer drivers are installed
3. Restart the app
4. Click "Refresh" button in print dialog

### **Python executable issues**

```bash
# Rebuild Python executable
pip install pyinstaller
pyinstaller print_handler.spec
```

## 🔗 Links

- **Repository**: https://github.com/ScottBruton/PrintPhotoApp
- **Releases**: https://github.com/ScottBruton/PrintPhotoApp/releases
- **Issues**: https://github.com/ScottBruton/PrintPhotoApp/issues

## 📚 Documentation

- **[RELEASE.md](./RELEASE.md)** - Complete release & auto-update guide
- **[package.json](./package.json)** - Build configuration
- **[.github/workflows/release.yml](./.github/workflows/release.yml)** - CI/CD workflow

---

**Made with ❤️ for easy photo printing**
