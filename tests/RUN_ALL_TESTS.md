# Complete Integration Test Execution Guide

This guide walks you through executing ALL integration tests in order.

**Estimated Time:** 2-3 hours

---

## Before You Start

### 1. Run Pre-Flight Checklist

```bash
# Review and complete
notepad tests\pre-flight-checklist.md
```

**Don't proceed until all checks pass!**

---

### 2. Prepare Test Environment

**Install current version:**
```bash
# Build if needed
npm run build

# Install
cd dist
# Run: PrintPhotoApp-Setup-1.0.3.exe
```

**Prepare sample data:**
- Place 10 test photos in `tests/sample-images/`
- Various sizes and orientations

---

## Test Execution Order

### Phase 1: Automated Tests (30 minutes)

#### Test 1A: GitHub Workflow Validation
```bash
node tests/validate-github-workflow.js
```
**Expected:** All 17 checks pass ✅

**Result:** ☐ Pass ☐ Fail

---

#### Test 1B: Startup Flow Tests
```bash
node tests/test-startup-flow.js
```
**Expected:** Build artifacts validated

**Result:** ☐ Pass ☐ Fail

**If failed:** Run `npm run build` first

---

#### Test 1C: IPC Channel Tests

**In app:**
1. Launch app: `npm run dev`
2. Open DevTools: Press F12
3. Go to Console tab
4. Copy/paste contents of `tests/test-ipc-channels.js`
5. Run: `IPCTests.runAll()`
6. Review results

**Expected:** All IPC tests pass

**Result:** ☐ Pass ☐ Fail

**Screenshot:** Save console output

---

### Phase 2: Manual Functional Tests (45 minutes)

Follow: `tests/MANUAL_TESTS.md`

**Sections to complete:**
- [ ] Test Phase 2: App Startup (both modes)
- [ ] Test Phase 3: Update Detection
- [ ] Test Phase 4: UI Integration (all states)
- [ ] Test Phase 5: Download Flow
- [ ] Test Phase 6: Installation Flow

**Time spent:** _______ minutes

---

### Phase 3: Error Scenario Tests (30 minutes)

Follow: `tests/test-error-scenarios.md`

**Priority tests:**
- [ ] Test 8.1.1: No Internet
- [ ] Test 8.2.1: Missing latest.yml
- [ ] Test 8.4.1: Uncaught exception
- [ ] Test 8.6: Recovery from error

**Optional tests (if time):**
- [ ] Test 8.1.2: Timeout
- [ ] Test 8.2.2: Malformed YAML
- [ ] Test 8.3.x: Permission errors

**Time spent:** _______ minutes

---

### Phase 4: Regression Tests (30 minutes)

Follow: `tests/test-regression.md`

**Complete all sections:**
- [ ] Test 9.1: Printing System
- [ ] Test 9.2: Layout Management
- [ ] Test 9.3: PDF Export
- [ ] Test 9.4: Image Editing
- [ ] Test 9.5: Multi-Page Navigation
- [ ] Test 9.6: State Management

**Integration Points Matrix:**
- [ ] Fill out matrix (each feature × 4 scenarios)

**Time spent:** _______ minutes

---

### Phase 5: End-to-End Scenarios (45 minutes)

Follow: `tests/MANUAL_TESTS.md` - Test Phase 10

**Critical Scenarios:**
- [ ] Scenario 1: First-Time Update (complete flow)
- [ ] Scenario 2: Remind Later
- [ ] Scenario 3: No Update Available

**Optional:**
- [ ] Scenario 4: Network Error Recovery

**Time spent:** _______ minutes

---

### Phase 6: Performance Testing (20 minutes)

Follow: `tests/MANUAL_TESTS.md` - Test Phase 11

**Metrics to collect:**
- [ ] Startup time (5 trials, average)
- [ ] Memory usage (initial, 5min, after check)
- [ ] CPU usage (idle, checking, downloading)

**Performance benchmarks:**
- Startup < 2000ms: ☐ Pass ☐ Fail
- Memory stable: ☐ Pass ☐ Fail
- CPU < 10%: ☐ Pass ☐ Fail

**Time spent:** _______ minutes

---

### Phase 7: GitHub Actions CI/CD (20 minutes)

**Create test release:**
```bash
# Update version in package.json to 1.0.4-test
git add package.json
git commit -m "Test release 1.0.4-test"
git tag v1.0.4-test
git push origin main
git push origin v1.0.4-test
```

**Monitor:**
- Visit: https://github.com/ScottBruton/PrintPhotoApp/actions
- Watch build progress
- Time the build

**Checklist:**
- [ ] Workflow triggers
- [ ] All steps green
- [ ] Build < 10 minutes
- [ ] Release created
- [ ] Assets uploaded (exe + yml)

**Clean up test release:**
```bash
# After verification
git tag -d v1.0.4-test
git push origin :refs/tags/v1.0.4-test
# Delete release from GitHub UI
```

**Result:** ☐ Pass ☐ Fail

**Time spent:** _______ minutes

---

## Test Report Completion

### Fill Out Report
```bash
notepad tests\TEST_REPORT.md
```

**Sections to complete:**
1. Header (date, tester, environment)
2. Executive summary
3. All test category results
4. Critical issues (if any)
5. Performance metrics
6. Recommendations
7. Sign-off

**Attach:**
- [ ] Screenshots of update banner
- [ ] Log files (PrintPhotoApp-updates.log)
- [ ] GitHub Actions build logs
- [ ] Any error screenshots

---

## Final Verification

### Sanity Check
- [ ] All test sections completed
- [ ] All checkboxes checked or marked N/A
- [ ] All performance metrics recorded
- [ ] All issues documented
- [ ] Overall pass/fail determined

### Critical Criteria
- [ ] No P0 (blocker) issues
- [ ] No more than 2 P1 (critical) issues
- [ ] Update flow works end-to-end at least once
- [ ] No regressions in core features
- [ ] Performance acceptable

**Overall Test Suite:** ☐ Pass ☐ Fail

---

## Decision Matrix

| Outcome | Action |
|---------|--------|
| All tests passed, no issues | ✅ Approve for release |
| Minor issues only (P3) | ✅ Approve with documentation |
| Major issues (P2) | ⚠️ Fix, then re-test affected areas |
| Critical issues (P1) | ❌ Fix, then re-run full suite |
| Blocker issues (P0) | 🛑 Do not release, fix immediately |

---

## Post-Testing Actions

### If Tests Pass

1. **Update documentation:**
   - [ ] Add any learnings to RELEASE.md
   - [ ] Update QUICK_START.md if needed
   - [ ] Note any quirks in README.md

2. **Prepare for release:**
   - [ ] Merge to main branch (if on feature branch)
   - [ ] Version ready for tagging
   - [ ] Team notified

3. **Archive test results:**
   - [ ] Save TEST_REPORT.md with timestamp
   - [ ] Save screenshots
   - [ ] Save log files

### If Tests Fail

1. **Document all failures:**
   - [ ] Complete TEST_REPORT.md
   - [ ] Create GitHub issues for bugs
   - [ ] Prioritize issues

2. **Fix critical issues:**
   - [ ] Address P0 and P1 issues
   - [ ] Commit fixes
   - [ ] Re-run affected tests

3. **Schedule re-test:**
   - [ ] After fixes, run full suite again
   - [ ] Don't release until green

---

## Quick Reference

### Test Files
- `tests/validate-github-workflow.js` - Automated workflow check
- `tests/test-startup-flow.js` - Automated build verification
- `tests/test-ipc-channels.js` - Browser console tests
- `tests/MANUAL_TESTS.md` - Manual test procedures
- `tests/test-error-scenarios.md` - Error handling tests
- `tests/test-regression.md` - Existing feature tests
- `tests/TEST_REPORT.md` - Results documentation

### Log Locations
- Update logs: `%TEMP%\PrintPhotoApp-updates.log`
- App logs: `%APPDATA%\PrintPhotoApp\logs\`
- Console logs: DevTools console
- GitHub logs: Actions tab in repository

### Key Commands
```bash
# Development
npm run dev

# Build production
npm run build

# Validate workflow
node tests/validate-github-workflow.js

# Create test release
git tag v1.0.X-test
git push origin v1.0.X-test
```

---

## Test Completion Sign-Off

**All tests executed:** ☐ Yes ☐ Partial

**Test report completed:** ☐ Yes ☐ No

**Issues logged:** ☐ Yes ☐ No ☐ None found

**Ready for release:** ☐ Yes ☐ No ☐ Conditional

**Tester signature:** _________________

**Date:** _________________

**Next step:**

☐ **PASS** → Proceed with release (see RELEASE.md)

☐ **FAIL** → Fix issues and re-test

☐ **BLOCKED** → Escalate to senior engineer

---

**Total time spent testing:** _______ hours

**Overall experience:** ☐ Smooth ☐ Some issues ☐ Difficult

**Would recommend improvements to:**
________________________________
________________________________
