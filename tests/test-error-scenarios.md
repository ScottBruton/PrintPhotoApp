# Error Scenario Integration Tests

## Test 8.1: Network Errors

### Test 8.1.1: No Internet Connection

**Setup:**
1. Build and install production app
2. Disconnect from internet (disable WiFi/ethernet)
3. Launch app

**Expected Behavior:**
- App should launch normally
- After 5 seconds, update check happens
- Check fails silently (no crash)
- No error dialog shown to user
- App remains fully functional

**Verification:**
1. Check log file: `%TEMP%\PrintPhotoApp-updates.log`
2. Should contain:
   ```
   Checking for updates...
   Error: [network error description]
   ```

**Result:** ☐ Pass ☐ Fail

**Notes:** ________________________________

---

### Test 8.1.2: Timeout During Check

**Setup:**
1. Use network throttling (Windows network settings or Fiddler)
2. Set very slow connection (dial-up speed)
3. Launch app

**Expected Behavior:**
- App launches normally
- Update check times out gracefully
- No indefinite hang
- App usable

**Result:** ☐ Pass ☐ Fail

---

### Test 8.1.3: GitHub API Rate Limit

**Setup:**
- Trigger multiple update checks rapidly (if possible)
- Or wait for GitHub rate limit (60 requests/hour unauthenticated)

**Expected Behavior:**
- 403 response handled
- Error logged
- User sees "Check failed" message
- App continues working

**Result:** ☐ Pass ☐ Fail

---

## Test 8.2: Invalid Responses

### Test 8.2.1: Missing latest.yml (404)

**Setup:**
1. Create GitHub release without latest.yml file
   - Or delete latest.yml from existing release
2. Launch app with that release as latest

**Expected Behavior:**
- Update check returns 404
- Error logged: "latest.yml not found"
- No crash
- No update banner shown
- App works normally

**Logs should show:**
```
Checking for updates...
Error: Cannot find latest.yml
```

**Result:** ☐ Pass ☐ Fail

---

### Test 8.2.2: Malformed latest.yml

**Setup:**
1. Manually edit latest.yml in a release
2. Add invalid YAML syntax
3. Launch app

**Expected Behavior:**
- Parse error caught
- Error logged
- No crash
- No update shown

**Result:** ☐ Pass ☐ Fail

---

### Test 8.2.3: Invalid Version Format

**Setup:**
1. Create latest.yml with invalid version:
   ```yaml
   version: invalid.version.here
   ```

**Expected Behavior:**
- Version comparison fails gracefully
- Error logged
- No crash
- No update shown

**Result:** ☐ Pass ☐ Fail

---

### Test 8.2.4: Missing Installer File

**Setup:**
1. Create release with latest.yml
2. Delete the .exe file
3. Try to download update

**Expected Behavior:**
- Download starts
- 404 error when fetching .exe
- Error message shown to user
- Download fails gracefully
- Can retry

**Result:** ☐ Pass ☐ Fail

---

## Test 8.3: Permission Errors

### Test 8.3.1: Read-Only Temp Directory

**⚠️ Requires Admin Privileges**

**Setup:**
1. Open PowerShell as Admin
2. Make temp read-only:
   ```powershell
   $tempPath = [System.IO.Path]::GetTempPath()
   icacls $tempPath /deny Users:W
   ```
3. Launch app

**Expected Behavior:**
- App launches (might be slower)
- Update check might fail
- Error logged (or logs to alternate location)
- App doesn't crash
- Main features work

**Cleanup:**
```powershell
icacls $tempPath /grant Users:W
```

**Result:** ☐ Pass ☐ Fail ☐ Skipped (admin required)

---

### Test 8.3.2: Cannot Write Logs

**Setup:**
1. Delete temp log file if exists
2. Create file named `PrintPhotoApp-updates.log` as read-only
3. Launch app

**Expected Behavior:**
- App launches
- Logging fails silently or logs to console
- App works

**Result:** ☐ Pass ☐ Fail

---

### Test 8.3.3: Cannot Download to Temp

**Setup:**
- Disk full scenario (hard to test)
- Or temp directory full

**Expected Behavior:**
- Download fails with disk space error
- Error shown to user
- App doesn't crash

**Result:** ☐ Pass ☐ Fail ☐ Skipped (hard to reproduce)

---

## Test 8.4: Update Handler Crashes

### Test 8.4.1: Uncaught Exception in update.js

**Setup:**
1. Temporarily modify updateHandler/update.js
2. Add intentional error:
   ```javascript
   function checkForUpdatesSilent() {
       throw new Error('Simulated crash');
   }
   ```
3. Launch app

**Expected Behavior:**
- App should still launch
- Main window appears
- Error caught and logged
- App remains functional
- Update system gracefully fails

**Cleanup:**
- Revert the intentional error

**Result:** ☐ Pass ☐ Fail

---

### Test 8.4.2: IPC Communication Failure

**Setup:**
1. Temporarily modify preload.js
2. Remove update IPC channels
3. Launch app

**Expected Behavior:**
- App launches
- Update banner might not appear (expected)
- No console errors about missing functions
- App works for normal features

**Cleanup:**
- Revert preload.js changes

**Result:** ☐ Pass ☐ Fail

---

## Test 8.5: Corrupted Update File

### Test 8.5.1: Corrupted Installer Download

**Setup:**
1. Modify latest.yml to have wrong SHA512 hash
2. Try to download update

**Expected Behavior:**
- Download completes
- SHA512 verification fails
- Error: "Update file corrupted"
- Download rejected
- Can retry

**Result:** ☐ Pass ☐ Fail

---

## Error Recovery Tests

### Test 8.6: Recovery from Network Error

**Procedure:**
1. Start with no internet
2. Launch app → Update check fails
3. Connect internet
4. Manually trigger update check (if feature exists)
5. Or wait for next app launch

**Expected:**
- First check fails gracefully
- Second check succeeds
- Update detected

**Result:** ☐ Pass ☐ Fail

---

### Test 8.7: Recovery from Failed Download

**Procedure:**
1. Start download
2. Disconnect internet at 50%
3. Download fails
4. Reconnect internet
5. Close and relaunch app
6. Update check should trigger again

**Expected:**
- Failed download removed
- New download starts fresh
- Completes successfully

**Result:** ☐ Pass ☐ Fail

---

## Summary

**Total Tests:** _______
**Passed:** _______
**Failed:** _______
**Skipped:** _______

**Critical Errors Found:** ☐ None ☐ Yes (list below)

________________________________
________________________________

**Overall Error Handling:** ☐ Robust ☐ Needs Work

**Tester:** _________________

**Date:** _________________
