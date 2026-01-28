# 📦 Release & Auto-Update Guide

## 🎯 Overview

This app uses **electron-updater** with **GitHub Releases** for automatic updates. Users get notified in-app when a new version is available.

---

## 🚀 Creating a Release

### **1. Update Version**

Edit `package.json` and bump the version:

```json
{
  "version": "1.0.4"  // Increment this
}
```

**Version Guidelines:**
- **Patch** (1.0.X): Bug fixes, small changes
- **Minor** (1.X.0): New features, backward compatible
- **Major** (X.0.0): Breaking changes

### **2. Commit Changes**

```bash
git add package.json
git commit -m "Bump version to 1.0.4"
```

### **3. Create and Push Tag**

```bash
# Create tag matching package.json version
git tag v1.0.4

# Push code and tag
git push origin main
git push origin v1.0.4
```

### **4. GitHub Actions Builds Automatically**

The workflow will:
1. ✅ Build Python executable (`print_handler.exe`)
2. ✅ Build Electron installer (`PrintPhotoApp-Setup-1.0.4.exe`)
3. ✅ Create GitHub Release
4. ✅ Upload installer + update files (`latest.yml`)
5. ✅ Users get notified automatically!

**Monitor Progress:**
- Go to: https://github.com/ScottBruton/PrintPhotoApp/actions
- Click on the running workflow
- Watch build logs in real-time

---

## 🔐 Code Signing (Optional but Recommended)

### **Why Code Sign?**

❌ **Without Signing:**
- Windows SmartScreen warns: "Unknown publisher"
- Users must click "More info" → "Run anyway"
- Less professional appearance

✅ **With Signing:**
- No warnings
- Shows your company name
- Builds user trust
- Better for production releases

### **A. Unsigned Path (Current - For Testing)**

Your app is currently configured for unsigned builds:

```json:package.json
"build": {
  "forceCodeSigning": false,
  "win": {
    "signAndEditExecutable": false
  }
}
```

**This is fine for:**
- Development
- Internal testing
- Personal use
- Family/friends

### **B. Signed Path (Production)**

#### **Step 1: Get a Code Signing Certificate**

**Options:**

1. **Sectigo/Comodo** (~$180/year)
   - https://sectigo.com/ssl-certificates-tls/code-signing
   - Most affordable

2. **DigiCert** (~$500/year)
   - https://www.digicert.com/signing/code-signing-certificates
   - Premium option

3. **SSL.com** (~$200/year)
   - https://www.ssl.com/certificates/code-signing/
   - Good middle ground

**Certificate Types:**
- **OV (Organization Validation)**: Basic, immediate
- **EV (Extended Validation)**: Best reputation, requires hardware token

#### **Step 2: Export Certificate as PFX**

Once you receive your certificate:

```bash
# You'll get a .pfx file and password
# Example: MyCompany_CodeSign.pfx
```

#### **Step 3: Convert PFX to Base64 (for GitHub Secrets)**

**On Windows (PowerShell):**

```powershell
$pfxBytes = [System.IO.File]::ReadAllBytes("C:\Path\To\MyCompany_CodeSign.pfx")
$base64 = [System.Convert]::ToBase64String($pfxBytes)
$base64 | Out-File -FilePath "cert_base64.txt"
```

#### **Step 4: Add GitHub Secrets**

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

Add these secrets:

1. **`WINDOWS_CERTIFICATE`**
   - Value: Contents of `cert_base64.txt`

2. **`WINDOWS_CERTIFICATE_PASSWORD`**
   - Value: Your certificate password

#### **Step 5: Update package.json**

```json
"build": {
  "forceCodeSigning": true,
  "win": {
    "certificateSubjectName": "Your Company Name",
    "signingHashAlgorithms": ["sha256"],
    "signAndEditExecutable": true,
    "signDlls": true
  }
}
```

#### **Step 6: Update GitHub Workflow**

The workflow already includes signing setup (currently commented out). Uncomment these sections in `.github/workflows/release.yml`:

```yaml
# UNCOMMENT THESE LINES FOR CODE SIGNING:
# - name: Decode certificate
#   run: |
#     $cert = [System.Convert]::FromBase64String("${{ secrets.WINDOWS_CERTIFICATE }}")
#     [System.IO.File]::WriteAllBytes("${{ github.workspace }}\cert.pfx", $cert)
#   shell: pwsh
# 
# - name: Build Electron app (with signing)
#   env:
#     GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
#     CSC_LINK: ${{ github.workspace }}\cert.pfx
#     CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
#   run: npm run build
```

---

## ✅ Testing Updates Locally

### **Test 1: Check for Updates (Development)**

1. Start app in dev mode:
   ```bash
   npm run dev
   ```

2. You'll see:
   ```
   Development mode - auto-updates disabled
   ```

This is expected! Updates only work in **production builds**.

### **Test 2: Build and Test Production**

1. Build the app:
   ```bash
   npm run build
   ```

2. Install the app:
   - Navigate to `dist/PrintPhotoApp-Setup-X.X.X.exe`
   - Run the installer
   - Launch the installed app

3. Verify:
   - Check app version in UI
   - Wait 5 seconds for background update check
   - Check logs: `%TEMP%\PrintPhotoApp-updates.log`

### **Test 3: Simulate Update**

1. **Create a new release** with a higher version (e.g., if app is 1.0.4, release 1.0.5)

2. **Wait 5 seconds** after app starts

3. **Update banner should appear** at the top of the app:
   - "Version 1.0.5 Available"
   - "Download" button

4. **Click Download**:
   - Progress bar appears
   - Shows download speed

5. **After download**:
   - Button changes to "Install & Restart"
   - Click it to update

6. **App restarts** with new version!

---

## 📋 Verification Checklist

### **Before Each Release**

- [ ] Version bumped in `package.json`
- [ ] All changes committed
- [ ] App builds successfully locally: `npm run build`
- [ ] Python executable builds: Check `dist/print_handler.exe` exists
- [ ] Git tag matches package.json version exactly
- [ ] Tag pushed to GitHub
- [ ] GitHub Actions workflow passed (green checkmark)

### **After Release is Published**

- [ ] Release appears on: https://github.com/ScottBruton/PrintPhotoApp/releases
- [ ] Installer file uploaded (`PrintPhotoApp-Setup-X.X.X.exe`)
- [ ] Update metadata file uploaded (`latest.yml`)
- [ ] Install app from new installer
- [ ] App shows correct version
- [ ] Check update log file for errors

### **Testing Auto-Update**

- [ ] Install previous version
- [ ] Launch app
- [ ] Wait 5 seconds
- [ ] Update banner appears
- [ ] Click "Download" - progress shows
- [ ] Click "Install & Restart" - app updates
- [ ] App relaunches with new version

---

## 🐛 Troubleshooting

### **Issue: "No updates available" but new version exists**

**Possible Causes:**

1. **Version not incremented properly**
   ```bash
   # Check your version
   cat package.json | grep version
   
   # Check latest release
   # Visit: https://github.com/ScottBruton/PrintPhotoApp/releases/latest
   ```

2. **Update files not uploaded**
   - Check release has `latest.yml` file
   - Download and inspect `latest.yml`:
   ```yaml
   version: 1.0.5
   files:
     - url: PrintPhotoApp-Setup-1.0.5.exe
   ```

3. **App version cached**
   - Uninstall app completely
   - Delete: `%APPDATA%\PrintPhotoApp`
   - Reinstall

### **Issue: Update fails to download**

**Check these:**

1. **Log file**: `%TEMP%\PrintPhotoApp-updates.log`
   ```
   Look for errors like:
   - "404 Not Found" = Missing files
   - "403 Forbidden" = Token issue
   - "Network error" = Connection issue
   ```

2. **GitHub Release Assets**
   - Must include both:
     - `PrintPhotoApp-Setup-X.X.X.exe`
     - `latest.yml`
   - Files must be publicly accessible

3. **Repository Privacy**
   - If repo is **private**, you need `GITHUB_REPO_KEY` token
   - Update `updateHandler/update.js`:
   ```javascript
   autoUpdater.setFeedURL({
     provider: 'github',
     owner: 'ScottBruton',
     repo: 'PrintPhotoApp',
     private: true,  // Set to true if private
     token: process.env.GITHUB_REPO_KEY
   });
   ```

### **Issue: GitHub Actions build fails**

**Common Failures:**

1. **Python build fails**
   ```
   Solution: Check print_handler.spec is valid
   Test locally: pyinstaller print_handler.spec
   ```

2. **Electron build fails**
   ```
   Solution: Check package.json build config
   Test locally: npm run build
   ```

3. **Tag/version mismatch**
   ```
   Solution: Ensure git tag matches package.json
   Tag: v1.0.5 ← Must match → package.json: "version": "1.0.5"
   ```

### **Issue: Update installs but app won't start**

**Possible Causes:**

1. **Missing dependencies**
   ```bash
   # Check all dependencies included
   npm run build
   # Inspect dist/ folder
   ```

2. **Python exe missing**
   ```
   Solution: Ensure print_handler.exe is in extraResources
   Check: dist/win-unpacked/resources/print_handler.exe
   ```

3. **Corrupted update**
   ```bash
   # Delete and reinstall
   rm -rf %APPDATA%\PrintPhotoApp
   # Reinstall from fresh installer
   ```

---

## 📊 Update Flow Diagram

```
App Starts (Production)
  ↓
Wait 5 seconds
  ↓
Check GitHub for latest.yml
  ↓
Compare versions
  ├─→ Same/Older: No action
  └─→ Newer: Show update banner
              ↓
          User clicks "Download"
              ↓
          Download .exe file
              ↓
          Show progress (%)
              ↓
          Download complete
              ↓
          Show "Install & Restart"
              ↓
          User clicks button
              ↓
          Install silently
              ↓
          App restarts automatically
              ↓
          New version running! ✅
```

---

## 🔑 GitHub Token Setup

Your app currently uses `GITHUB_REPO_KEY` from `.env` for **local development**.

For **production releases**, the workflow uses `GITHUB_TOKEN` (automatic).

**If your repo is PRIVATE:**

1. Create Personal Access Token:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes:
     - ✅ `repo` (all)
   - Generate and copy token

2. Add to `.env` file:
   ```bash
   GITHUB_REPO_KEY=ghp_YourTokenHere
   ```

3. **NEVER commit `.env` to git** (already in `.gitignore`)

---

## 📚 Additional Resources

- **electron-updater docs**: https://www.electron.build/auto-update
- **electron-builder config**: https://www.electron.build/configuration/configuration
- **GitHub Actions docs**: https://docs.github.com/en/actions
- **Code signing guide**: https://www.electron.build/code-signing

---

## 🎉 Quick Release Checklist

```bash
# 1. Update version
code package.json  # Change version to 1.0.5

# 2. Commit
git add package.json
git commit -m "Release v1.0.5"

# 3. Tag and push
git tag v1.0.5
git push origin main
git push origin v1.0.5

# 4. Wait for GitHub Actions (5-10 minutes)
# 5. Check release: https://github.com/ScottBruton/PrintPhotoApp/releases
# 6. Done! Users will be notified automatically! 🎉
```

---

**Questions?** Check logs in `%TEMP%\PrintPhotoApp-updates.log`
