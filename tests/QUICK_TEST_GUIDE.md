# Quick Integration Test Guide

**For rapid validation before release**

**Time:** 20 minutes

---

## Step 1: Automated Validations (5 minutes)

Run all automated checks:

```bash
# Validate GitHub workflow
node tests/validate-github-workflow.js

# Validate configurations
node tests/test-config-validation.js

# Validate build artifacts (if built)
node tests/test-startup-flow.js
```

**Expected:** All checks pass ✅

**If any fail:** Stop and fix issues before proceeding

---

## Step 2: Build Production Version (3 minutes)

```bash
npm run build
```

**Verify:**
- [ ] Build completes without errors
- [ ] dist/PrintPhotoApp-Setup-X.X.X.exe created
- [ ] dist/latest.yml created
- [ ] File size > 80MB

---

## Step 3: Install and Test App (5 minutes)

```bash
cd dist
# Run: PrintPhotoApp-Setup-X.X.X.exe
```

**After Installation:**

1. Launch app from Start Menu
2. Verify:
   - [ ] Window appears < 2 seconds
   - [ ] Version shown in UI matches
   - [ ] Console shows "Development mode - auto-updates disabled" (if dev) OR "Starting background update check..." (if production)

3. Quick feature test:
   - [ ] Click "Add Page"
   - [ ] Select size "102x152-p"
   - [ ] Drag photo to placeholder
   - [ ] Photo appears
   - [ ] Click "Print Preview"
   - [ ] Print dialog opens
   - [ ] Close dialog

**All work?** ☐ Yes ☐ No

---

## Step 4: Test IPC Communication (3 minutes)

**In running app:**

1. Press `F12` to open DevTools
2. Go to Console tab
3. Test update API:

```javascript
// Test 1: Check for updates
await window.electron.checkForUpdates()
// Should return object with success/error

// Test 2: Verify APIs exist
console.log('Update APIs:', {
    checkForUpdates: typeof window.electron.checkForUpdates,
    onUpdateAvailable: typeof window.electron.onUpdateAvailable,
    downloadUpdate: typeof window.electron.downloadUpdate,
    installUpdate: typeof window.electron.installUpdate
});
// All should show: 'function'
```

**Expected:** All APIs available, no errors

---

## Step 5: Test Update Banner UI (4 minutes)

**If no real update available, simulate by:**

1. In DevTools console:
```javascript
// Manually trigger banner (for UI testing only)
const banner = document.getElementById('updateBanner');
banner.classList.remove('hidden');
document.getElementById('updateTitle').textContent = 'Version 1.0.99 Available';
document.getElementById('updateMessage').textContent = 'Test update notification';
```

2. Verify:
   - [ ] Banner slides down from top
   - [ ] Purple gradient background
   - [ ] Download icon bounces
   - [ ] Text readable
   - [ ] Buttons styled correctly

3. Test progress bar:
```javascript
const progress = document.getElementById('updateProgress');
const fill = document.getElementById('updateProgressFill');
const text = document.getElementById('updateProgressText');
progress.classList.remove('hidden');
fill.style.width = '50%';
text.textContent = '50%';
```

4. Verify:
   - [ ] Progress bar appears
   - [ ] Fills to 50%
   - [ ] Text shows 50%

5. Click "Later" button:
   - [ ] Banner dismisses
   - [ ] Page container margin resets

---

## Step 6: Quick Regression Check (3 minutes)

**Test core features:**

1. **Layout:**
   - [ ] Add page → Works
   - [ ] Add photo → Works
   - [ ] Edit photo → Works

2. **Save/Load:**
   - [ ] Save layout → Works
   - [ ] Load layout → Works

3. **Export:**
   - [ ] Export PDF → Works
   - [ ] PDF contains photos → Works

4. **Undo/Redo:**
   - [ ] Undo action → Works
   - [ ] Redo action → Works

---

## Final Checklist

**All automated tests passed:** ☐ Yes ☐ No

**App builds successfully:** ☐ Yes ☐ No

**App installs successfully:** ☐ Yes ☐ No

**Core features work:** ☐ Yes ☐ No

**Update UI appears correctly:** ☐ Yes ☐ No

**No console errors:** ☐ Yes ☐ No

**No crashes:** ☐ Yes ☐ No

---

## Decision

**If all checked:**
✅ **PASS** - Ready for full integration testing or release

**If any unchecked:**
❌ **FAIL** - Review issues and fix before proceeding

---

## Next Steps

**If Passed:**
→ Proceed with full test suite: `tests/RUN_ALL_TESTS.md`

OR

→ Create test release: See `RELEASE.md`

**If Failed:**
→ Fix issues
→ Re-run this quick test
→ Don't proceed until green

---

**Tester:** _______________ **Date:** _______________ **Result:** ☐ Pass ☐ Fail
