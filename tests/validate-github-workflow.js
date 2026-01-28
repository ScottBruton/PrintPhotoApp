/**
 * GitHub Workflow Validation Script
 * 
 * Validates the release.yml workflow file for common issues
 * Run: node tests/validate-github-workflow.js
 */

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'release.yml');

console.log('🔍 Validating GitHub Workflow...\n');
console.log(`File: ${workflowPath}\n`);

// Check if file exists
if (!fs.existsSync(workflowPath)) {
    console.error('❌ Workflow file not found!');
    console.error(`Expected: ${workflowPath}`);
    process.exit(1);
}

// Read workflow file
const workflowContent = fs.readFileSync(workflowPath, 'utf8');

const checks = {
    passed: [],
    failed: [],
    warnings: []
};

function pass(check) {
    checks.passed.push(check);
    console.log(`✅ ${check}`);
}

function fail(check) {
    checks.failed.push(check);
    console.error(`❌ ${check}`);
}

function warn(check) {
    checks.warnings.push(check);
    console.warn(`⚠️  ${check}`);
}

// Validation checks

// 1. Basic YAML structure
if (workflowContent.includes('name:') && workflowContent.includes('on:')) {
    pass('Basic YAML structure valid');
} else {
    fail('Invalid YAML structure - missing name or on');
}

// 2. Trigger configuration
if (workflowContent.includes('tags:') && workflowContent.includes("'v*.*.*'")) {
    pass('Tag trigger configured correctly');
} else {
    fail('Tag trigger missing or incorrect');
}

// 3. Windows runner
if (workflowContent.includes('runs-on: windows-latest')) {
    pass('Windows runner specified');
} else {
    fail('Windows runner not specified (required for this app)');
}

// 4. Permissions
if (workflowContent.includes('permissions:') && workflowContent.includes('contents: write')) {
    pass('Permissions set correctly (contents: write)');
} else {
    fail('Missing permissions for creating releases');
}

// 5. Node.js setup
if (workflowContent.includes('setup-node@v4')) {
    pass('Node.js setup step present');
} else {
    warn('Using older setup-node version or missing');
}

// 6. Python setup
if (workflowContent.includes('setup-python@v5')) {
    pass('Python setup step present');
} else {
    warn('Python setup might be missing or old version');
}

// 7. npm ci (deterministic install)
if (workflowContent.includes('npm ci')) {
    pass('Using npm ci for deterministic installs');
} else if (workflowContent.includes('npm install')) {
    warn('Using npm install instead of npm ci (less deterministic)');
} else {
    fail('No npm install step found');
}

// 8. Python dependencies
if (workflowContent.includes('pip install -r requirements.txt')) {
    pass('Python dependencies install step present');
} else {
    fail('Missing Python dependencies install');
}

// 9. PyInstaller
if (workflowContent.includes('pip install pyinstaller')) {
    pass('PyInstaller install step present');
} else {
    fail('Missing PyInstaller install');
}

// 10. Python exe build
if (workflowContent.includes('pyinstaller print_handler.spec')) {
    pass('Python executable build step present');
} else {
    fail('Missing Python exe build step');
}

// 11. Python exe verification
if (workflowContent.includes('print_handler.exe')) {
    pass('Python exe verification present');
} else {
    warn('No verification that Python exe was built');
}

// 12. Electron build
if (workflowContent.includes('npm run build')) {
    pass('Electron build step present');
} else {
    fail('Missing Electron build step');
}

// 13. GH_TOKEN for electron-builder
if (workflowContent.includes('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}')) {
    pass('GITHUB_TOKEN configured for electron-builder');
} else {
    fail('Missing GH_TOKEN environment variable');
}

// 14. Release creation
if (workflowContent.includes('softprops/action-gh-release@v1') || 
    workflowContent.includes('actions/create-release')) {
    pass('Release creation action present');
} else {
    fail('Missing release creation step');
}

// 15. File uploads
if (workflowContent.includes('dist/*.exe') && workflowContent.includes('dist/*.yml')) {
    pass('Correct files uploaded (.exe and .yml)');
} else {
    fail('Missing or incorrect file patterns for upload');
}

// 16. Version extraction
if (workflowContent.includes('extract_version') || workflowContent.includes('github.ref_name')) {
    pass('Version extraction logic present');
} else {
    warn('No version extraction from tag');
}

// 17. Build artifact upload (for debugging)
if (workflowContent.includes('upload-artifact')) {
    pass('Build logs upload configured');
} else {
    warn('No artifact upload (harder to debug failed builds)');
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${checks.passed.length}`);
console.log(`❌ Failed: ${checks.failed.length}`);
console.log(`⚠️  Warnings: ${checks.warnings.length}`);
console.log('='.repeat(60));

if (checks.failed.length > 0) {
    console.log('\n❌ FAILED CHECKS:');
    checks.failed.forEach((check, i) => {
        console.log(`  ${i + 1}. ${check}`);
    });
}

if (checks.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    checks.warnings.forEach((check, i) => {
        console.log(`  ${i + 1}. ${check}`);
    });
}

console.log('\n');

if (checks.failed.length === 0) {
    console.log('✅ Workflow validation PASSED!');
    console.log('Ready to push tags and trigger builds.\n');
    process.exit(0);
} else {
    console.log('❌ Workflow validation FAILED!');
    console.log('Fix issues before pushing tags.\n');
    process.exit(1);
}
