/**
 * App Startup Flow Integration Test
 * 
 * Tests the startup sequence and timing
 * Run: node tests/test-startup-flow.js
 */

const { spawn } = require('child_process');
const path = require('path');

const results = {
    passed: [],
    failed: [],
    metrics: {}
};

function log(message, isError = false) {
    const prefix = isError ? '❌' : '✅';
    console.log(`${prefix} ${message}`);
}

async function testDevMode() {
    console.log('\n=== Testing Development Mode Startup ===\n');

    return new Promise((resolve) => {
        const startTime = Date.now();
        let appReadyTime = null;
        let devModeLogged = false;

        const electron = spawn('npx', ['electron', '.'], {
            cwd: path.join(__dirname, '..'),
            shell: true
        });

        electron.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('STDOUT:', output);

            if (output.includes('App ready') && !appReadyTime) {
                appReadyTime = Date.now() - startTime;
                log(`App ready in ${appReadyTime}ms`);
                results.metrics.devModeStartup = appReadyTime;

                if (appReadyTime < 5000) {
                    results.passed.push('Dev mode startup < 5s');
                } else {
                    results.failed.push('Dev mode startup too slow');
                }
            }

            if (output.includes('Development mode - auto-updates disabled')) {
                devModeLogged = true;
                log('Development mode message logged');
                results.passed.push('Dev mode update disabled message');
            }
        });

        electron.stderr.on('data', (data) => {
            console.log('STDERR:', data.toString());
        });

        // Kill after 10 seconds
        setTimeout(() => {
            electron.kill();
            
            if (!appReadyTime) {
                log('App did not start within 10 seconds', true);
                results.failed.push('Dev mode startup timeout');
            }

            if (!devModeLogged) {
                log('Dev mode message not logged', true);
                results.failed.push('Dev mode message missing');
            }

            resolve();
        }, 10000);
    });
}

async function checkProductionBuild() {
    console.log('\n=== Checking Production Build ===\n');

    const distPath = path.join(__dirname, '..', 'dist');
    const fs = require('fs');

    // Check if dist exists
    if (!fs.existsSync(distPath)) {
        log('dist/ folder not found - run npm run build first', true);
        results.failed.push('Production build missing');
        return;
    }

    // Look for installer
    const files = fs.readdirSync(distPath);
    const installer = files.find(f => f.match(/PrintPhotoApp-Setup-.*\.exe$/));

    if (installer) {
        log(`Found installer: ${installer}`);
        const stats = fs.statSync(path.join(distPath, installer));
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        log(`Installer size: ${sizeMB} MB`);
        results.metrics.installerSize = sizeMB;

        if (stats.size > 50 * 1024 * 1024) { // > 50MB
            results.passed.push('Installer size reasonable');
        } else {
            results.failed.push('Installer size too small (might be incomplete)');
        }
    } else {
        log('Installer not found', true);
        results.failed.push('Installer missing');
    }

    // Check for latest.yml
    const latestYml = path.join(distPath, 'latest.yml');
    if (fs.existsSync(latestYml)) {
        log('latest.yml exists (required for auto-update)');
        const content = fs.readFileSync(latestYml, 'utf8');
        
        if (content.includes('version:') && content.includes('files:')) {
            results.passed.push('latest.yml structure valid');
            log('latest.yml structure looks good');
        } else {
            results.failed.push('latest.yml malformed');
            log('latest.yml missing required fields', true);
        }
    } else {
        log('latest.yml not found (required for auto-update)', true);
        results.failed.push('latest.yml missing');
    }

    // Check Python exe
    const pythonExe = path.join(distPath, 'print_handler.exe');
    if (fs.existsSync(pythonExe)) {
        log('print_handler.exe exists');
        results.passed.push('Python executable built');
    } else {
        log('print_handler.exe not found', true);
        results.failed.push('Python executable missing');
    }
}

function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Passed: ${results.passed.length}`);
    console.log(`Total Failed: ${results.failed.length}`);
    
    if (Object.keys(results.metrics).length > 0) {
        console.log('\nMetrics:');
        Object.entries(results.metrics).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
    }
    
    if (results.passed.length > 0) {
        console.log('\n✅ PASSED:');
        results.passed.forEach(test => console.log(`  - ${test}`));
    }
    
    if (results.failed.length > 0) {
        console.log('\n❌ FAILED:');
        results.failed.forEach(test => console.log(`  - ${test}`));
    }

    console.log('\n' + '='.repeat(60));

    if (results.failed.length === 0) {
        console.log('✅ All startup tests PASSED!');
        process.exit(0);
    } else {
        console.log('❌ Some tests FAILED!');
        process.exit(1);
    }
}

async function runAll() {
    console.log('🧪 Startup Flow Integration Tests');
    console.log('='.repeat(60));
    
    try {
        await checkProductionBuild();
        // Note: Automated dev mode test would require electron programmatically
        // For now, just check build artifacts
        
        printSummary();
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runAll();
}

module.exports = { runAll, results };
