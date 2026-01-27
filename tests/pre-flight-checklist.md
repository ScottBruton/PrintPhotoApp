# Pre-Flight Integration Testing Checklist

Run this checklist BEFORE starting integration tests to ensure environment is ready.

---

## Environment Setup

### Node.js Dependencies
```bash
npm install
```
- [ ] No errors during installation
- [ ] node_modules/ folder created
- [ ] All packages installed

**Verify key packages:**
```bash
npm list electron electron-updater electron-builder
```
- [ ] electron: v28.x.x
- [ ] electron-updater: v6.3.9
- [ ] electron-builder: v24.13.3

---

### Python Dependencies
```bash
pip install -r requirements.txt
```
- [ ] No errors during installation
- [ ] pywin32 installed

**Verify:**
```bash
python -c "import win32print; print('pywin32 OK')"
```
- [ ] Prints "pywin32 OK"

---

### Build Tools
```bash
pip install pyinstaller
```
- [ ] PyInstaller installed

**Test Python build:**
```bash
pyinstaller print_handler.spec
```
- [ ] Build completes without errors
- [ ] dist/print_handler.exe exists
- [ ] File size > 5MB (reasonable)

---

## Code Verification

### Files Modified (Auto-Update)
- [ ] main.js - app.whenReady() updated
- [ ] updateHandler/update.js - complete rewrite
- [ ] preload.js - update IPC channels added
- [ ] index.html - update banner added
- [ ] styles.css - banner styles added
- [ ] package.json - scripts updated

**Quick check:**
```bash
git status
```
- [ ] All files tracked or intentionally untracked

---

### Files Created
- [ ] .github/workflows/release.yml
- [ ] tests/test-ipc-channels.js
- [ ] tests/MANUAL_TESTS.md
- [ ] tests/TEST_REPORT.md
- [ ] tests/pre-flight-checklist.md (this file)
- [ ] RELEASE.md
- [ ] README.md
- [ ] QUICK_START.md
- [ ] IMPLEMENTATION_SUMMARY.md

---

## Configuration Verification

### package.json
```bash
cat package.json
```

**Verify:**
- [ ] "version": "1.0.3" (or current version)
- [ ] "main": "main.js"
- [ ] scripts.build exists
- [ ] scripts.prebuild exists
- [ ] build.appId: "com.scottbruton.printphotoapp"
- [ ] build.win.target: "nsis"
- [ ] build.publish: ["github"]
- [ ] build.generateUpdatesFilesForAllChannels: true

---

### Environment Variables
```bash
type .env
```
- [ ] .env file exists
- [ ] GITHUB_REPO_KEY is set
- [ ] Token starts with "ghp_"

**Security check:**
```bash
git check-ignore .env
```
- [ ] Returns ".env" (file is gitignored)

---

### GitHub Repository
```bash
git remote -v
```
- [ ] origin: https://github.com/ScottBruton/PrintPhotoApp.git

**Check GitHub:**
- [ ] Repository exists
- [ ] Can access repository
- [ ] Repository has releases page

---

## Test Build (Pre-Test)

### Development Build
```bash
npm run dev
```
- [ ] App launches
- [ ] Main window appears
- [ ] No console errors
- [ ] Can close app

**Press Ctrl+C to stop**

---

### Production Build
```bash
npm run build
```
- [ ] Build completes without errors
- [ ] dist/ folder created
- [ ] PrintPhotoApp-Setup-1.0.3.exe exists
- [ ] File size reasonable (> 80MB)

**Check dist/ contents:**
```bash
dir dist
```
- [ ] win-unpacked/ folder exists
- [ ] latest.yml exists (electron-builder creates this)

---

## GitHub Actions Validation

### Workflow File Syntax
```bash
# Install GitHub CLI if needed
# Download: https://cli.github.com/

# Validate workflow
gh workflow view
```
- [ ] release.yml appears in list
- [ ] No syntax errors

**Manual validation:**
- [ ] Open .github/workflows/release.yml
- [ ] No obvious YAML syntax errors
- [ ] All steps have names
- [ ] All required fields present

---

## Network Connectivity

### GitHub API Access
```bash
curl -I https://api.github.com/repos/ScottBruton/PrintPhotoApp/releases/latest
```
- [ ] Returns 200 or 404 (both OK)
- [ ] No timeout
- [ ] No DNS errors

### GitHub Releases Access
- [ ] Can access: https://github.com/ScottBruton/PrintPhotoApp/releases
- [ ] Can view existing releases (if any)

---

## Printer Setup (For Regression Tests)

**Check printers:**
```bash
wmic printer get name
```
- [ ] At least one printer listed
- [ ] Printer powered on and ready

**Alternative:**
- [ ] "Microsoft Print to PDF" available (virtual printer)

---

## Disk Space

**Check available space:**
```bash
wmic logicaldisk get caption,freespace,size
```

**Requirements:**
- [ ] C:\ has > 5GB free (for builds)
- [ ] Temp has > 2GB free (for downloads)

---

## Test Data Preparation

### Sample Images
- [ ] Have 5-10 sample photos ready
- [ ] Various sizes (landscape, portrait, square)
- [ ] JPEG format
- [ ] < 10MB each

**Suggested location:** D:\Programming\PrintPhotoApp\tests\sample-images\

---

### Test Layouts
Create test layout files for loading tests:
- [ ] simple-layout.json (1 page, 1 photo)
- [ ] multi-page-layout.json (3 pages, multiple photos)
- [ ] complex-layout.json (edited photos, rotations)

---

## Baseline Metrics

### Current App (Before Testing)

**Startup time (3 trials):**
1. _______ ms
2. _______ ms
3. _______ ms
Average: _______ ms

**Memory usage (idle):**
- Initial: _______ MB
- After 5 min: _______ MB

**CPU usage (idle):**
- Average: _______ %

**These are baseline - compare after testing**

---

## Test Tools Setup

### DevTools Access
- [ ] Know how to open: Ctrl+Shift+I or F12
- [ ] Console tab accessible
- [ ] Network tab accessible

### Task Manager
- [ ] Can open: Ctrl+Shift+Esc
- [ ] Can monitor memory
- [ ] Can monitor CPU

### Log Viewer
- [ ] Know location: %TEMP%\PrintPhotoApp-updates.log
- [ ] Can open with notepad
- [ ] Can tail logs (using PowerShell Get-Content -Wait)

---

## Git State

**Ensure clean state:**
```bash
git status
```
- [ ] On correct branch (main or test branch)
- [ ] No uncommitted changes (or changes are intentional)
- [ ] All new files added

**Latest commit:**
```bash
git log -1 --oneline
```
- [ ] Shows expected last commit

---

## Pre-Test Safety

### Backup
- [ ] Current code committed to git
- [ ] Can rollback if needed: git log shows commit hash
- [ ] Have copy of dist/ folder (optional)

### App Data
- [ ] Backed up any important layouts from %APPDATA%\PrintPhotoApp
- [ ] OK to uninstall/reinstall app

---

## Sign-Off

**All checks completed:** ☐ Yes ☐ No

**Issues blocking tests:**
________________________________
________________________________

**Ready to proceed with integration testing:** ☐ Yes ☐ No

**Checklist completed by:** _________________

**Date:** _________________

---

## Next Steps

If all checks passed:
1. ✅ Proceed to tests/MANUAL_TESTS.md
2. ✅ Execute Phase 1: IPC Communication Integration
3. ✅ Continue through all phases
4. ✅ Fill out TEST_REPORT.md

If any checks failed:
1. ❌ Fix the issues
2. ❌ Re-run this checklist
3. ❌ Don't proceed until all ✅
