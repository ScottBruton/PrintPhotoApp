# Manual Integration Testing Procedures

## Prerequisites

- Windows 10 or later
- Node.js v18+
- Python 3.11+
- All dependencies installed (`npm install`, `pip install -r requirements.txt`)

---

## Test Phase 1: IPC Communication Integration

### Automated IPC Tests

1. **Start the app in development mode:**
   ```bash
   npm run dev
   ```

2. **Open DevTools:**
   - Press `Ctrl+Shift+I` or `F12`
   - Go to Console tab

3. **Load test script:**
   ```javascript
   // Copy and paste contents of tests/test-ipc-channels.js
   // Then run:
   IPCTests.runAll()
   ```

4. **Verify results:**
   - Check console output for ✅ PASSED and ❌ FAILED
   - All tests should PASS

### Manual IPC Verification

1. **Test event flow:**
   - In console: `window.electron.checkForUpdates()`
   - Watch console for event logs
   - Verify update banner appears (if update available)

2. **Test button actions:**
   - Click "Download" button on banner
   - Watch console for download events
   - Verify progress updates

---

## Test Phase 2: App Startup Flow Integration

### Test 2.1: Development Mode

**Procedure:**
```bash
npm run dev
```

**Expected Results:**
- [ ] Main window appears in < 2 seconds
- [ ] Console logs: "App ready"
- [ ] Console logs: "Development mode - auto-updates disabled"
- [ ] No update banner appears
- [ ] App logo visible in top-left
- [ ] Toolbar buttons all visible
- [ ] Can click "Add Page" button

**Pass Criteria:** All checkboxes checked

---

### Test 2.2: Production Mode

**Procedure:**
```bash
npm run build
cd dist
# Run: PrintPhotoApp-Setup-1.0.3.exe
# Install app
# Launch installed app
```

**Expected Results:**
- [ ] Installer completes successfully
- [ ] App launches from Start Menu/Desktop
- [ ] Main window appears immediately (< 2 seconds)
- [ ] Console logs: "App ready" (if DevTools open)
- [ ] After 5 seconds: "Starting background update check..."
- [ ] If update available: Banner slides down
- [ ] Can create layouts during update check

**Pass Criteria:** All checkboxes checked

**Performance Metrics:**
- Startup time: ______ ms (should be < 2000ms)
- Time to update check: ______ s (should be ~5s)

---

## Test Phase 3: Update Detection Integration

### Test 3.1: Version Comparison

**Setup:** Need multiple release versions

**Test Cases:**

| Current Version | Latest Release | Expected Behavior | Result |
|----------------|----------------|-------------------|--------|
| 1.0.3 | 1.0.4 | Show update | ☐ |
| 1.0.4 | 1.0.4 | No update | ☐ |
| 1.0.5 | 1.0.4 | No update | ☐ |

**Procedure:**
1. Install version from table
2. Launch app
3. Wait 5 seconds
4. Check if banner appears
5. Mark result

---

### Test 3.2: Log File Verification

**Procedure:**
1. Launch app (production build)
2. Wait 10 seconds
3. Open log file:
   ```bash
   notepad %TEMP%\PrintPhotoApp-updates.log
   ```

**Expected Log Contents:**
```
=== Initializing Auto-Updater ===
App version: 1.0.X
Platform: win32
Log file: C:\Users\...\Temp\PrintPhotoApp-updates.log
GitHub feed URL configured
Checking for updates...
[Update available: 1.0.X] OR [No updates available]
```

**Verification:**
- [ ] Log file exists
- [ ] Contains "Initializing Auto-Updater"
- [ ] Shows correct app version
- [ ] Shows platform as "win32"
- [ ] Contains "Checking for updates"
- [ ] Shows result (available or not available)
- [ ] No ERROR messages (unless network issue)

---

## Test Phase 4: UI Integration

### Test 4.1: Banner Appearance

**Procedure:**
1. Install older version (e.g., 1.0.3)
2. Ensure newer version published (e.g., 1.0.4)
3. Launch app
4. Wait for banner

**Visual Checklist:**
- [ ] Banner slides down smoothly (animation smooth)
- [ ] Purple gradient background visible
- [ ] Download icon (⬇️) bounces
- [ ] Text is readable
- [ ] "Download" button styled correctly
- [ ] "Later" button styled correctly
- [ ] No layout overlap with header/toolbar
- [ ] Page container shifts down (margin-top: 60px)

**Screenshot:** (Take screenshot and save as `test-results/banner-appearance.png`)

---

### Test 4.2: Banner States

**State 1: Update Available**
- [ ] Title: "Version X.X.X Available"
- [ ] Message: "A new version is ready to download"
- [ ] Buttons visible: [Download] [Later]
- [ ] Download button has primary styling (white on purple)

**State 2: Downloading**
1. Click "Download" button
2. Verify:
   - [ ] Button text changes to "Downloading..."
   - [ ] Button disabled (grayed out)
   - [ ] Progress bar appears
   - [ ] Percentage updates (0% → 100%)
   - [ ] Speed displayed (X.X MB/s)
   - [ ] Message: "Downloading update... (X.X MB/s)"

**State 3: Downloaded**
1. Wait for download to complete
2. Verify:
   - [ ] Title: "Update Ready"
   - [ ] Message: "Version X.X.X has been downloaded"
   - [ ] Download button hidden
   - [ ] "Install & Restart" button visible
   - [ ] Progress bar hidden

**State 4: Error**
1. Disconnect internet
2. Trigger update check
3. Verify:
   - [ ] Title: "Update Error"
   - [ ] Message shows error description
   - [ ] Banner auto-dismisses after 5 seconds

---

### Test 4.3: UI Layout Integration

**Window Resize Test:**
1. Make window smaller (800x600)
   - [ ] Banner still visible
   - [ ] Text doesn't overflow
   - [ ] Buttons still clickable

2. Make window larger (1920x1080)
   - [ ] Banner centered properly
   - [ ] No weird spacing

3. Maximize window
   - [ ] Banner spans full width
   - [ ] Layout looks good

**Multi-Component Test:**
- [ ] Toolbar remains clickable with banner visible
- [ ] Can open print dialog with banner visible
- [ ] Can add photos with banner visible
- [ ] Banner doesn't block size modal
- [ ] Banner doesn't block image editor modal

---

## Test Phase 5: Download Flow Integration

### Test 5.1: Complete Download

**Procedure:**
1. Trigger update (banner appears)
2. Click "Download"
3. Monitor progress

**Checklist:**
- [ ] Progress bar appears
- [ ] Percentage: 0% → 100%
- [ ] Speed shows in KB/s or MB/s
- [ ] Total size displayed
- [ ] Progress smooth (no jumps)
- [ ] Can still use app during download
- [ ] Download completes successfully

**Metrics:**
- File size: ______ MB
- Download time: ______ seconds
- Average speed: ______ MB/s

---

### Test 5.2: Download Interruption

**Test Case 1: Network Disconnect**
1. Start download
2. Wait until 50% complete
3. Disconnect internet
4. **Expected:** Error message appears
5. Reconnect internet
6. **Expected:** Can retry download

**Test Case 2: Close Banner During Download**
1. Start download
2. Click "Later" button
3. **Expected:** Download continues in background
4. Relaunch app
5. **Expected:** Download resumes or restarts

**Results:**
- [ ] Network disconnect handled gracefully
- [ ] Can retry after network error
- [ ] Closing banner doesn't break download

---

## Test Phase 6: Installation Flow Integration

### Test 6.1: Complete Installation

**⚠️ WARNING:** This will close and restart the app!

**Procedure:**
1. Download update completely
2. Click "Install & Restart"
3. Observe behavior

**Checklist:**
- [ ] App closes within 2 seconds
- [ ] All windows close
- [ ] Installer runs (may see brief flash)
- [ ] App relaunches automatically (15-30 seconds)
- [ ] New version shows in UI
- [ ] No error dialogs
- [ ] Previous layouts still available

**Metrics:**
- Time to close: ______ seconds
- Time to reinstall: ______ seconds
- Time to relaunch: ______ seconds
- Total update time: ______ seconds

---

### Test 6.2: Data Preservation

**Before Update:**
1. Create a test layout:
   - Add 2 pages
   - Add photos to pages
   - Edit one photo (zoom, rotate)
   - Save layout as "test-update.json"
2. Note app version

**After Update:**
1. Check app version (should be new version)
2. Load "test-update.json"
3. Verify:
   - [ ] Layout loads successfully
   - [ ] Both pages present
   - [ ] All photos visible
   - [ ] Photo edits preserved (zoom, rotation)
   - [ ] Can save layout again
   - [ ] Can create new layouts

---

## Test Phase 7: GitHub Actions CI/CD Integration

### Test 7.1: Workflow Trigger

**Procedure:**
```bash
# 1. Update version in package.json to 1.0.4-test
# 2. Commit
git add package.json
git commit -m "Test release 1.0.4-test"

# 3. Create and push tag
git tag v1.0.4-test
git push origin main
git push origin v1.0.4-test
```

**Monitor:**
- Visit: https://github.com/ScottBruton/PrintPhotoApp/actions
- Click on the running workflow

**Checklist:**
- [ ] Workflow triggered automatically
- [ ] All steps start executing
- [ ] No immediate failures

---

### Test 7.2: Build Steps Verification

**Monitor each step in GitHub Actions:**

- [ ] Checkout code ✓
- [ ] Setup Node.js ✓
- [ ] Setup Python ✓
- [ ] Install Node dependencies ✓
- [ ] Install Python dependencies ✓
- [ ] Install PyInstaller ✓
- [ ] Build Python executable ✓
- [ ] Verify Python executable exists ✓
- [ ] Build Electron app ✓
- [ ] List build artifacts ✓
- [ ] Extract version from tag ✓
- [ ] Create GitHub Release ✓
- [ ] Upload build logs ✓

**Total Time:** ______ minutes (should be < 10 min)

---

### Test 7.3: Release Verification

**Visit:** https://github.com/ScottBruton/PrintPhotoApp/releases

**Checklist:**
- [ ] Release exists with correct tag (v1.0.4-test)
- [ ] Title: "Release 1.0.4-test"
- [ ] Release body contains version info
- [ ] Assets section visible

**Required Assets:**
- [ ] `PrintPhotoApp-Setup-1.0.4-test.exe` (installer)
- [ ] `latest.yml` (CRITICAL!)
- [ ] File sizes look reasonable

**Download `latest.yml`:**
- [ ] File downloads successfully
- [ ] Contains version: 1.0.4-test
- [ ] Contains files array with installer
- [ ] Contains sha512 hash
- [ ] Contains releaseDate

---

## Test Phase 8: Error Handling Integration

### Test 8.1: Network Errors

**Test Case 1: No Internet**
1. Disconnect internet
2. Launch app
3. Wait 10 seconds

**Expected:**
- [ ] App launches normally
- [ ] No error dialogs
- [ ] No crash
- [ ] Check logs for graceful error

**Test Case 2: Timeout**
1. Use network throttling (slow 3G)
2. Launch app
3. Wait for update check

**Expected:**
- [ ] Update check times out gracefully
- [ ] No crash
- [ ] App remains functional

---

### Test 8.2: Invalid Responses

**Test Case: Missing latest.yml**
1. Create draft release without uploading latest.yml
2. Launch app
3. Observe behavior

**Expected:**
- [ ] No crash
- [ ] Error logged to file
- [ ] User might see brief error banner
- [ ] App continues working

---

### Test 8.3: Permission Errors

**Test Case: Read-only temp directory**
1. Make %TEMP% read-only (requires admin)
2. Launch app
3. Observe behavior

**Expected:**
- [ ] App launches
- [ ] Update check might fail
- [ ] Error logged
- [ ] App doesn't crash

---

## Test Phase 9: Regression Testing

### Test 9.1: Printing System

**Procedure:**
1. Launch app (with update banner visible if possible)
2. Create layout with photos
3. Click "Print Preview"

**Checklist:**
- [ ] Print dialog opens
- [ ] Printer list populated
- [ ] Can select printer
- [ ] Print preview shows correctly
- [ ] Can change print settings (quality, paper type)
- [ ] Print button clickable
- [ ] Can close print dialog

**During Update Download:**
- [ ] Can open print dialog
- [ ] Print dialog works normally
- [ ] Can complete print job

---

### Test 9.2: Layout Management

**Checklist:**
- [ ] Can create new page
- [ ] Can select photo size
- [ ] Can add photos (drag & drop)
- [ ] Can add photos (click to browse)
- [ ] Photo appears in placeholder
- [ ] Can edit photo (zoom, rotate)
- [ ] Can save layout
- [ ] Can load layout
- [ ] Can navigate between pages
- [ ] Can delete page
- [ ] Undo/redo works

**During Update:**
- [ ] All layout features work while banner visible
- [ ] Can save layout during download
- [ ] Layout not corrupted after update install

---

### Test 9.3: PDF Export

**Procedure:**
1. Create multi-page layout (2-3 pages)
2. Add photos to each page
3. Click "Export PDF"

**Checklist:**
- [ ] Export dialog appears
- [ ] Can choose save location
- [ ] Export completes
- [ ] PDF file created
- [ ] PDF opens in PDF viewer
- [ ] All pages present in PDF
- [ ] Photos render correctly
- [ ] No visual glitches

**During Update:**
- [ ] Can export PDF while downloading
- [ ] Export completes successfully

---

### Test 9.4: Image Editing

**Procedure:**
1. Add photo to placeholder
2. Hover over photo
3. Click edit button (pencil icon)

**Checklist:**
- [ ] Image editor modal opens
- [ ] Preview shows correctly
- [ ] Zoom slider works (100-200%)
- [ ] Rotation slider works (0-360°)
- [ ] "Fit to Card" button works
- [ ] "Fill Card" button works
- [ ] "Rotate Left" button works
- [ ] "Rotate Right" button works
- [ ] Undo/Redo works
- [ ] "Save Changes" applies changes
- [ ] "Cancel" reverts changes
- [ ] Changes persist after save

---

### Test 9.5: Multi-Page Navigation

**Procedure:**
1. Create 3 pages
2. Add different content to each
3. Navigate between pages

**Checklist:**
- [ ] Page indicator shows "Page X of 3"
- [ ] Previous/Next buttons work
- [ ] Each page shows correct content
- [ ] Can delete middle page
- [ ] Pages renumber correctly
- [ ] Can't delete last page (error message)

---

## Test Phase 10: End-to-End Scenarios

### Scenario 1: First-Time Update (Complete)

**Starting State:** v1.0.3 installed, v1.0.4 available

**Steps:**
1. [ ] Launch app
2. [ ] Main window appears immediately
3. [ ] Start creating layout (add page, add photo)
4. [ ] After 5 seconds: Banner appears "Version 1.0.4 Available"
5. [ ] Continue editing photo (zoom, rotate)
6. [ ] Click "Download" button
7. [ ] Progress bar shows: 0% → 100% (note time: _____ seconds)
8. [ ] Save layout as "pre-update-test.json"
9. [ ] Banner shows: "Update Ready - Install & Restart"
10. [ ] Click "Install & Restart"
11. [ ] App closes
12. [ ] App relaunches automatically
13. [ ] Check version in UI: Should show 1.0.4
14. [ ] Load "pre-update-test.json"
15. [ ] Verify layout intact
16. [ ] Create new photo, print it
17. [ ] Export to PDF

**Overall Success:** ☐ Pass ☐ Fail

**Notes:** ________________________________

---

### Scenario 2: Remind Later

**Steps:**
1. [ ] Update banner appears
2. [ ] Click "Later" button
3. [ ] Banner dismisses
4. [ ] Continue working (create layout)
5. [ ] Save and close app
6. [ ] Relaunch app next session
7. [ ] After 5 seconds: Banner appears again
8. [ ] Click "Download"
9. [ ] Download and install

**Success:** ☐ Pass ☐ Fail

---

### Scenario 3: No Update Available

**Setup:** Install latest version

**Steps:**
1. [ ] Launch app
2. [ ] Wait 10 seconds
3. [ ] No banner appears
4. [ ] Check logs: "No updates available"
5. [ ] App works normally

**Success:** ☐ Pass ☐ Fail

---

## Test Phase 11: Performance

### Test 11.1: Startup Performance

**Procedure:**
1. Close app
2. Launch app
3. Start timer when clicking icon
4. Stop timer when window visible

**Repeat 5 times and average:**

| Attempt | Startup Time (ms) |
|---------|-------------------|
| 1 | _______ |
| 2 | _______ |
| 3 | _______ |
| 4 | _______ |
| 5 | _______ |
| **Average** | **_______** |

**Pass Criteria:** Average < 2000ms

---

### Test 11.2: Memory Usage

**Procedure:**
1. Open Task Manager
2. Launch app
3. Let run for 5 minutes
4. Note memory usage

**Metrics:**
- Initial memory: _______ MB
- After 5 min: _______ MB
- After update check: _______ MB
- After download: _______ MB

**Pass Criteria:** No continuous growth (leak)

---

### Test 11.3: CPU Usage

**Procedure:**
1. Open Task Manager
2. Monitor CPU during:
   - App idle: _______ %
   - Update checking: _______ %
   - Downloading: _______ %
   - Normal use: _______ %

**Pass Criteria:** All < 10% (except brief spikes)

---

## Test Phase 12: Test Report

After completing all tests, fill out: `tests/TEST_REPORT.md`

**Summary Checklist:**
- [ ] All IPC tests passed
- [ ] Startup flow works correctly
- [ ] UI integrates seamlessly
- [ ] Downloads work reliably
- [ ] Installations complete successfully
- [ ] GitHub Actions builds successfully
- [ ] Error handling graceful
- [ ] No regressions in existing features
- [ ] End-to-end scenarios successful
- [ ] Performance acceptable

**Overall Grade:** ☐ Pass ☐ Fail

**Date Tested:** ________________

**Tester:** ________________

**Notes/Issues Found:**
________________________________
________________________________
________________________________
