/**
 * Configuration Validation Test
 * 
 * Validates all configuration files are correct for auto-update
 * Run: node tests/test-config-validation.js
 */

const fs = require('fs');
const path = require('path');

const results = {
    passed: [],
    failed: [],
    warnings: []
};

function pass(check) {
    results.passed.push(check);
    console.log(`✅ ${check}`);
}

function fail(check) {
    results.failed.push(check);
    console.error(`❌ ${check}`);
}

function warn(check) {
    results.warnings.push(check);
    console.warn(`⚠️  ${check}`);
}

console.log('🔍 Configuration Validation for Auto-Update\n');
console.log('='.repeat(60));

// 1. Validate package.json
console.log('\n📦 Validating package.json...\n');

const packagePath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packagePath)) {
    fail('package.json not found');
    process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Version format
if (/^\d+\.\d+\.\d+$/.test(pkg.version)) {
    pass(`Version format valid: ${pkg.version}`);
} else {
    fail(`Invalid version format: ${pkg.version}`);
}

// Main entry point
if (pkg.main === 'main.js') {
    pass('Main entry point: main.js');
} else {
    fail(`Unexpected main: ${pkg.main}`);
}

// electron-updater dependency
if (pkg.dependencies && pkg.dependencies['electron-updater']) {
    pass(`electron-updater installed: ${pkg.dependencies['electron-updater']}`);
} else {
    fail('electron-updater not in dependencies');
}

// electron-builder dev dependency
if (pkg.devDependencies && pkg.devDependencies['electron-builder']) {
    pass(`electron-builder installed: ${pkg.devDependencies['electron-builder']}`);
} else {
    fail('electron-builder not in devDependencies');
}

// Build configuration
if (pkg.build) {
    pass('Build configuration present');
    
    // appId
    if (pkg.build.appId) {
        pass(`appId: ${pkg.build.appId}`);
    } else {
        fail('appId missing in build config');
    }
    
    // Windows target
    if (pkg.build.win && pkg.build.win.target === 'nsis') {
        pass('Windows target: nsis');
    } else {
        fail('Windows target not set to nsis');
    }
    
    // Publish configuration
    if (pkg.build.publish && pkg.build.publish.includes('github')) {
        pass('Publish target: github');
    } else {
        fail('GitHub publish target not configured');
    }
    
    // Generate update files
    if (pkg.build.generateUpdatesFilesForAllChannels === true) {
        pass('generateUpdatesFilesForAllChannels: true');
    } else {
        warn('generateUpdatesFilesForAllChannels not set (should be true)');
    }
    
    // NSIS configuration
    if (pkg.build.nsis) {
        if (pkg.build.nsis.oneClick === false) {
            pass('NSIS oneClick: false (user can choose install dir)');
        }
        if (pkg.build.nsis.perMachine === true) {
            pass('NSIS perMachine: true (all users)');
        }
    } else {
        warn('NSIS configuration missing');
    }
} else {
    fail('Build configuration missing');
}

// Repository URL
if (pkg.repository && pkg.repository.url) {
    const repoUrl = pkg.repository.url;
    if (repoUrl.includes('ScottBruton/PrintPhotoApp')) {
        pass(`Repository URL: ${repoUrl}`);
    } else {
        warn(`Unexpected repository: ${repoUrl}`);
    }
} else {
    fail('Repository URL missing');
}

// Scripts
const requiredScripts = ['start', 'dev', 'build', 'build:python', 'prebuild'];
requiredScripts.forEach(script => {
    if (pkg.scripts && pkg.scripts[script]) {
        pass(`Script '${script}' defined`);
    } else {
        fail(`Script '${script}' missing`);
    }
});

// 2. Validate main.js
console.log('\n⚙️  Validating main.js...\n');

const mainPath = path.join(__dirname, '..', 'main.js');
const mainContent = fs.readFileSync(mainPath, 'utf8');

// Check for update initialization
if (mainContent.includes('initAutoUpdater')) {
    pass('initAutoUpdater call present');
} else {
    fail('initAutoUpdater not called in main.js');
}

// Check for createWindow before update
if (mainContent.includes('createWindow();') && 
    mainContent.indexOf('createWindow();') < mainContent.indexOf('initAutoUpdater')) {
    pass('createWindow() called before initAutoUpdater (non-blocking)');
} else {
    warn('createWindow() order might be wrong');
}

// Check for production guard
if (mainContent.includes('app.isPackaged')) {
    pass('Production mode guard present');
} else {
    fail('No check for app.isPackaged (updates would run in dev)');
}

// Check for update IPC handler
if (mainContent.includes("ipcMain.handle('check-for-updates-manual'")) {
    pass('Manual update check IPC handler present');
} else {
    fail('Missing check-for-updates-manual handler');
}

// 3. Validate preload.js
console.log('\n🔒 Validating preload.js...\n');

const preloadPath = path.join(__dirname, '..', 'preload.js');
const preloadContent = fs.readFileSync(preloadPath, 'utf8');

// Update IPC channels
const updateAPIs = [
    'checkForUpdates',
    'onUpdateChecking',
    'onUpdateAvailable',
    'onUpdateNotAvailable',
    'onUpdateError',
    'onUpdateDownloadProgress',
    'onUpdateDownloaded',
    'downloadUpdate',
    'installUpdate',
    'remindLater'
];

updateAPIs.forEach(api => {
    if (preloadContent.includes(api)) {
        pass(`Update API '${api}' exposed`);
    } else {
        fail(`Update API '${api}' missing`);
    }
});

// Security checks
if (preloadContent.includes('contextBridge')) {
    pass('contextBridge used (secure)');
} else {
    fail('contextBridge not used (security issue)');
}

if (preloadContent.includes('contextIsolation')) {
    pass('contextIsolation referenced');
} else {
    warn('contextIsolation not explicitly mentioned');
}

// 4. Validate updateHandler/update.js
console.log('\n🔄 Validating updateHandler/update.js...\n');

const updateHandlerPath = path.join(__dirname, '..', 'updateHandler', 'update.js');
if (!fs.existsSync(updateHandlerPath)) {
    fail('updateHandler/update.js not found');
} else {
    const updateContent = fs.readFileSync(updateHandlerPath, 'utf8');
    
    // Required functions
    if (updateContent.includes('function initAutoUpdater')) {
        pass('initAutoUpdater function defined');
    } else {
        fail('initAutoUpdater function missing');
    }
    
    if (updateContent.includes('function setupAutoUpdaterEvents')) {
        pass('setupAutoUpdaterEvents function defined');
    } else {
        fail('setupAutoUpdaterEvents function missing');
    }
    
    if (updateContent.includes('function checkForUpdatesSilent')) {
        pass('checkForUpdatesSilent function defined');
    } else {
        fail('checkForUpdatesSilent function missing');
    }
    
    // GitHub configuration
    if (updateContent.includes("provider: 'github'")) {
        pass("GitHub provider configured");
    } else {
        fail('GitHub provider not configured');
    }
    
    if (updateContent.includes("owner: 'ScottBruton'")) {
        pass('GitHub owner: ScottBruton');
    } else {
        fail('GitHub owner not set correctly');
    }
    
    if (updateContent.includes("repo: 'PrintPhotoApp'")) {
        pass('GitHub repo: PrintPhotoApp');
    } else {
        fail('GitHub repo not set correctly');
    }
    
    // Auto-download disabled
    if (updateContent.includes('autoDownload = false') || 
        updateContent.includes('autoDownload: false')) {
        pass('autoDownload disabled (manual control)');
    } else {
        warn('autoDownload might be enabled (less control)');
    }
    
    // Event handlers
    const events = [
        'checking-for-update',
        'update-available',
        'update-not-available',
        'download-progress',
        'update-downloaded',
        'error'
    ];
    
    events.forEach(event => {
        if (updateContent.includes(`'${event}'`) || updateContent.includes(`"${event}"`)) {
            pass(`Event handler: ${event}`);
        } else {
            fail(`Event handler missing: ${event}`);
        }
    });
}

// 5. Validate index.html
console.log('\n🎨 Validating index.html...\n');

const indexPath = path.join(__dirname, '..', 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Update banner element
if (indexContent.includes('id="updateBanner"')) {
    pass('Update banner element present');
} else {
    fail('Update banner element missing');
}

// Banner controls
const bannerElements = [
    'updateTitle',
    'updateMessage',
    'updateProgress',
    'updateProgressFill',
    'updateProgressText',
    'updateDownloadBtn',
    'updateInstallBtn',
    'updateLaterBtn'
];

bannerElements.forEach(elem => {
    if (indexContent.includes(`id="${elem}"`)) {
        pass(`Banner element: ${elem}`);
    } else {
        fail(`Banner element missing: ${elem}`);
    }
});

// Update script
if (indexContent.includes('window.electron.onUpdateAvailable')) {
    pass('Update event handlers in inline script');
} else {
    fail('Update handling script missing');
}

// 6. Validate styles.css
console.log('\n🎨 Validating styles.css...\n');

const stylesPath = path.join(__dirname, '..', 'styles.css');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');

// Update banner styles
const requiredStyles = [
    '.update-banner',
    '.update-content',
    '.update-icon',
    '.update-text',
    '.update-actions',
    '.update-btn',
    '.update-progress-bar',
    '@keyframes slideDown'
];

requiredStyles.forEach(style => {
    if (stylesContent.includes(style)) {
        pass(`Style defined: ${style}`);
    } else {
        fail(`Style missing: ${style}`);
    }
});

// 7. Validate .env (security check)
console.log('\n🔐 Validating .env...\n');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    pass('.env file exists');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('GITHUB_REPO_KEY')) {
        pass('GITHUB_REPO_KEY defined');
    } else {
        warn('GITHUB_REPO_KEY not found in .env');
    }
} else {
    warn('.env file not found (optional for public repos)');
}

// Check .gitignore
const gitignorePath = path.join(__dirname, '..', '.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
if (gitignoreContent.includes('.env')) {
    pass('.env is gitignored (secure)');
} else {
    fail('.env NOT gitignored (security risk!)');
}

// 8. Print Summary
console.log('\n' + '='.repeat(60));
console.log('CONFIGURATION VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);
console.log('='.repeat(60));

if (results.failed.length > 0) {
    console.log('\n❌ FAILED CHECKS:');
    results.failed.forEach((check, i) => {
        console.log(`  ${i + 1}. ${check}`);
    });
    console.log('\n⛔ Fix these issues before proceeding!');
}

if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach((check, i) => {
        console.log(`  ${i + 1}. ${check}`);
    });
    console.log('\n💡 These are optional but recommended to fix.');
}

console.log('\n');

if (results.failed.length === 0) {
    console.log('✅ Configuration validation PASSED!');
    console.log('All files properly configured for auto-update.\n');
    process.exit(0);
} else {
    console.log('❌ Configuration validation FAILED!');
    console.log('Fix issues before testing.\n');
    process.exit(1);
}
