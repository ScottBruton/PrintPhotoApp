/**
 * Performance Monitoring for Auto-Update Integration
 * 
 * Monitors performance impact of auto-update system
 * Run: node tests/test-performance.js
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const metrics = {
    startupTimes: [],
    memoryUsage: {},
    cpuUsage: {},
    timestamp: new Date().toISOString()
};

console.log('📊 Performance Monitoring Test\n');
console.log('='.repeat(60));

// Test 1: Measure build artifact sizes
console.log('\n📦 Build Artifact Sizes\n');

const fs = require('fs');
const distPath = path.join(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    
    // Find installer
    const installer = files.find(f => f.match(/PrintPhotoApp-Setup-.*\.exe$/));
    if (installer) {
        const stats = fs.statSync(path.join(distPath, installer));
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`✅ Installer: ${installer}`);
        console.log(`   Size: ${sizeMB} MB`);
        metrics.installerSize = `${sizeMB} MB`;
    } else {
        console.log('⚠️  No installer found (run npm run build first)');
    }
    
    // Check latest.yml
    const latestYml = path.join(distPath, 'latest.yml');
    if (fs.existsSync(latestYml)) {
        const stats = fs.statSync(latestYml);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`✅ latest.yml: ${sizeKB} KB`);
        metrics.latestYmlSize = `${sizeKB} KB`;
    }
    
    // Check Python exe
    const pythonExe = path.join(distPath, 'print_handler.exe');
    if (fs.existsSync(pythonExe)) {
        const stats = fs.statSync(pythonExe);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`✅ print_handler.exe: ${sizeMB} MB`);
        metrics.pythonExeSize = `${sizeMB} MB`;
    }
} else {
    console.log('⚠️  dist/ folder not found');
}

// Test 2: Check log file size
console.log('\n📝 Log File Size\n');

const logPath = path.join(os.tmpdir(), 'PrintPhotoApp-updates.log');
if (fs.existsSync(logPath)) {
    const stats = fs.statSync(logPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`✅ Log file: ${sizeKB} KB`);
    metrics.logFileSize = `${sizeKB} KB`;
    
    if (stats.size > 1024 * 1024) { // > 1MB
        console.log('⚠️  Log file is large (> 1MB) - might need rotation');
    }
} else {
    console.log('ℹ️  No log file yet (app not run in production mode)');
}

// Test 3: Memory baseline
console.log('\n💾 Memory Usage Analysis\n');

const used = process.memoryUsage();
console.log('Node.js Process Memory:');
console.log(`  RSS: ${(used.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Heap Total: ${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Heap Used: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  External: ${(used.external / 1024 / 1024).toFixed(2)} MB`);

console.log('\nℹ️  For Electron app memory:');
console.log('  1. Launch app');
console.log('  2. Open Task Manager');
console.log('  3. Find "PrintPhotoApp"');
console.log('  4. Note memory usage over time');

// Test 4: Startup performance recommendations
console.log('\n⚡ Startup Performance Tips\n');

console.log('To measure startup time:');
console.log('1. Close app completely');
console.log('2. Start timer');
console.log('3. Launch app (click icon)');
console.log('4. Stop when window visible');
console.log('5. Repeat 5 times and average');
console.log('\nTarget: < 2000ms from click to visible window');

// Test 5: Network impact
console.log('\n🌐 Network Usage\n');

console.log('Update check network usage:');
console.log('  - Check for updates: ~5-10 KB (latest.yml)');
console.log('  - Download installer: ~80-100 MB (full .exe)');
console.log('\nℹ️  Monitor with Task Manager → Performance → Network');

// Summary
console.log('\n' + '='.repeat(60));
console.log('PERFORMANCE METRICS SUMMARY');
console.log('='.repeat(60));

if (Object.keys(metrics).length > 2) {
    Object.entries(metrics).forEach(([key, value]) => {
        if (key !== 'timestamp') {
            console.log(`${key}: ${value}`);
        }
    });
} else {
    console.log('⚠️  Limited metrics (build and run app for full metrics)');
}

console.log('\n📊 For complete performance testing:');
console.log('   Follow: tests/MANUAL_TESTS.md - Test Phase 11');

console.log('\n' + '='.repeat(60));

// Save metrics to file
const metricsPath = path.join(__dirname, 'performance-metrics.json');
fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
console.log(`\n✅ Metrics saved to: ${metricsPath}`);

console.log('\n✨ Performance test complete!\n');
