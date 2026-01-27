# Regression Testing - Existing Features

**Purpose:** Verify auto-update integration didn't break existing functionality

**Duration:** ~30 minutes

---

## Test 9.1: Printing System Integration

### Setup
1. Launch app (production or dev mode)
2. Create layout with 2 photos
3. Note if update banner is visible

### Test Print Dialog

**Basic Functionality:**
- [ ] Click "Print Preview" button
- [ ] Print dialog opens
- [ ] Dialog shows two sections: settings (left) and preview (right)

**Printer Selection:**
- [ ] Click "Refresh" button (🔄)
- [ ] Printer list populates
- [ ] Can see printer names
- [ ] Can select a printer
- [ ] Printer shows status (Ready, Offline, etc.)

**Print Settings:**
- [ ] Copies: Can change number (1-99)
- [ ] Layout: Can select Portrait/Landscape
- [ ] Quality: Can select 150/300/600 DPI
- [ ] Pages: Can select All or Custom
- [ ] Paper Type: Can select Plain/Glossy/Photo

**Print Preview:**
- [ ] Preview shows current page
- [ ] Zoom in/out buttons work
- [ ] Fit to screen button works
- [ ] If multi-page: Can navigate pages
- [ ] Preview accurate

**Test Print Actions:**
- [ ] Click "Print" button
- [ ] Print dialog appears (Windows native)
- [ ] Can complete or cancel print
- [ ] Dialog closes after print

**During Update Download (if applicable):**
- [ ] Print dialog opens normally
- [ ] All features work
- [ ] Print completes successfully
- [ ] No errors or crashes

**Result:** ☐ Pass ☐ Fail

**Issues:** ________________________________

---

## Test 9.2: Layout Management

### Page Creation
- [ ] Click "+ Add Page"
- [ ] Size modal appears
- [ ] Can select preset size (e.g., 102x152-p)
- [ ] Click "Apply To Page"
- [ ] Placeholders created in grid layout
- [ ] Page indicator updates "Page 2 of 2"

### Photo Addition (Drag & Drop)
1. Open File Explorer with test photo
2. Drag photo to placeholder
3. Verify:
   - [ ] Placeholder highlights on drag over
   - [ ] Photo appears in placeholder
   - [ ] Photo fits correctly

### Photo Addition (Click to Browse)
- [ ] Click empty placeholder
- [ ] File dialog opens
- [ ] Select image file
- [ ] Photo loads into placeholder

### Photo Editing
1. Hover over photo with image
2. Click edit button (✎)
3. Verify:
   - [ ] Image editor modal opens
   - [ ] Preview shows photo
   - [ ] Zoom slider: 100-200% works
   - [ ] Rotation slider: 0-360° works
   - [ ] "Fit to Card" button resets
   - [ ] "Fill Card" button fills
   - [ ] "Rotate Left" rotates -90°
   - [ ] "Rotate Right" rotates +90°
   - [ ] Undo/Redo works in editor
   - [ ] "Save Changes" applies edits
   - [ ] "Cancel" reverts changes
   - [ ] Changes persist after save

### Photo Deletion
- [ ] Hover over photo
- [ ] Click delete button (×)
- [ ] Confirm dialog appears
- [ ] Click "OK"
- [ ] Photo removed, placeholder empty

### Save Layout
- [ ] Click "Save" button
- [ ] Save dialog appears
- [ ] Choose location and filename
- [ ] File saves as .json
- [ ] File exists on disk

### Load Layout
- [ ] Click "Load" button
- [ ] Open file dialog appears
- [ ] Select saved .json file
- [ ] Layout loads correctly
- [ ] All pages present
- [ ] All photos visible
- [ ] Photo edits preserved

### Page Navigation
- [ ] Create 3 pages with different content
- [ ] Click Next button (→)
- [ ] Page advances
- [ ] Indicator shows "Page 2 of 3"
- [ ] Content changes
- [ ] Click Previous button (←)
- [ ] Returns to page 1

### Page Deletion
- [ ] Hover over page
- [ ] Delete button (×) appears top-right
- [ ] Click delete
- [ ] Confirm dialog appears
- [ ] Page deleted
- [ ] Remaining pages renumber
- [ ] Can't delete last page (error message)

### Undo/Redo
- [ ] Perform action (add photo)
- [ ] Click Undo (↶)
- [ ] Action reverted
- [ ] Click Redo (↷)
- [ ] Action reapplied
- [ ] History limit: 50 actions

### Reset Project
- [ ] Click "Reset" button
- [ ] Confirm dialog appears
- [ ] All pages cleared
- [ ] New page created
- [ ] Size modal appears

**During Update (if banner visible):**
- [ ] All layout features work
- [ ] Can save/load layouts
- [ ] No conflicts with update UI

**Result:** ☐ Pass ☐ Fail

**Issues:** ________________________________

---

## Test 9.3: PDF Export

### Single Page Export
1. Create layout with 1 page, 4 photos
2. Click "Export PDF"
3. Verify:
   - [ ] Save dialog appears
   - [ ] Default name: "photo-layout.pdf"
   - [ ] Can choose save location
   - [ ] Export completes (no errors)
   - [ ] PDF file created

4. Open PDF in viewer:
   - [ ] PDF opens
   - [ ] Single page visible
   - [ ] All 4 photos present
   - [ ] Photos clear (not blurry)
   - [ ] No placeholders (only photos)
   - [ ] Layout matches app

### Multi-Page Export
1. Create 3 pages with photos
2. Click "Export PDF"
3. Open exported PDF:
   - [ ] 3 pages in PDF
   - [ ] Each page correct
   - [ ] Page order correct
   - [ ] All photos render correctly

### Export During Update
1. Start update download
2. While downloading (50% complete)
3. Click "Export PDF"
4. Verify:
   - [ ] Export starts immediately
   - [ ] Export completes successfully
   - [ ] Download continues
   - [ ] PDF is valid

**Result:** ☐ Pass ☐ Fail

**Issues:** ________________________________

---

## Test 9.4: Image Editing Advanced

### Zoom Precision
- [ ] Zoom to 150%
- [ ] Image scales correctly
- [ ] No pixelation at preview
- [ ] Save and reopen: Zoom preserved

### Rotation Precision
- [ ] Rotate to 45°
- [ ] Image rotates correctly
- [ ] Rotate to 90°
- [ ] Image orientation correct
- [ ] Save and reopen: Rotation preserved

### Combined Transformations
- [ ] Zoom 150% + Rotate 90°
- [ ] Both apply correctly
- [ ] Pan image (if feature exists)
- [ ] All transformations preserved

### Edge Cases
- [ ] Zoom to 200% (max)
- [ ] Zoom to 100% (min)
- [ ] Rotate 360° (should be 0°)
- [ ] Negative rotation handled

**Result:** ☐ Pass ☐ Fail

---

## Test 9.5: Multi-Page Advanced

### Page Limit Test
- [ ] Create 10 pages
- [ ] All pages created successfully
- [ ] Navigation works smoothly
- [ ] No performance degradation

### Content Isolation
- [ ] Create Page 1: 51x51mm size
- [ ] Create Page 2: 102x152mm size
- [ ] Navigate between pages
- [ ] Each page maintains its size
- [ ] Photos don't cross pages

### Delete Middle Page
- [ ] Create 5 pages
- [ ] Delete page 3
- [ ] Pages renumber: 1,2,4,5 → 1,2,3,4
- [ ] Content correct on each
- [ ] Navigation still works

**Result:** ☐ Pass ☐ Fail

---

## Test 9.6: State Management

### Undo/Redo Deep Test
1. Perform 10 actions:
   - Add photo
   - Edit photo
   - Delete photo
   - Add page
   - etc.

2. Click Undo 5 times
   - [ ] Each action reverted in reverse order
   - [ ] UI updates correctly

3. Click Redo 3 times
   - [ ] Actions reapplied
   - [ ] State consistent

4. Perform new action
   - [ ] Future history cleared
   - [ ] Redo stack reset

### History Limit (50 actions)
1. Perform 60 actions rapidly
2. Click Undo 55 times
3. Verify:
   - [ ] Can only undo 50 times
   - [ ] Oldest actions discarded
   - [ ] No crash

### State Persistence Across Update
1. Create complex layout
2. Save layout
3. Install update (restart app)
4. Load layout
5. Verify:
   - [ ] All elements restored
   - [ ] Can undo actions after load
   - [ ] No state corruption

**Result:** ☐ Pass ☐ Fail

---

## Integration Points Matrix

| Feature | Works Alone | Works During Update Check | Works During Download | Works After Update Install |
|---------|-------------|---------------------------|----------------------|---------------------------|
| Add Page | ☐ | ☐ | ☐ | ☐ |
| Add Photo | ☐ | ☐ | ☐ | ☐ |
| Edit Photo | ☐ | ☐ | ☐ | ☐ |
| Save Layout | ☐ | ☐ | ☐ | ☐ |
| Load Layout | ☐ | ☐ | ☐ | ☐ |
| Print | ☐ | ☐ | ☐ | ☐ |
| Export PDF | ☐ | ☐ | ☐ | ☐ |
| Undo/Redo | ☐ | ☐ | ☐ | ☐ |

---

## Performance Impact

### Before Update System
- Startup: _______ ms
- Memory (idle): _______ MB
- CPU (idle): _______ %

### After Update System
- Startup: _______ ms
- Memory (idle): _______ MB
- CPU (idle): _______ %

### Impact
- Startup delta: _______ ms (should be < 100ms)
- Memory delta: _______ MB (should be < 10MB)
- CPU delta: _______ % (should be < 1%)

**Result:** ☐ Pass ☐ Fail

---

## Overall Regression Assessment

**Regressions Found:** ☐ None ☐ Minor ☐ Major ☐ Critical

**List of Regressions:**
1. ________________________________
2. ________________________________
3. ________________________________

**Recommendation:**
☐ No regressions - safe to release
☐ Minor regressions - document and release
☐ Major regressions - fix before release
☐ Critical regressions - block release

**Tested by:** _________________

**Date:** _________________
