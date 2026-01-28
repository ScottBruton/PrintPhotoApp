/**
 * IPC Channel Integration Tests
 * 
 * Run this in the browser DevTools console when app is running
 * Tests all IPC communication between main and renderer processes
 */

// Test Suite for IPC Channels
const IPCTests = {
    results: {
        passed: [],
        failed: []
    },

    log(message, isError = false) {
        const prefix = isError ? '❌' : '✅';
        console.log(`${prefix} ${message}`);
    },

    async testMainToRenderer() {
        console.log('\n=== Testing Main → Renderer Events ===\n');

        // Test 1.1: update-checking event
        let checkingReceived = false;
        window.electron.onUpdateChecking(() => {
            checkingReceived = true;
            this.log('update-checking event received');
            this.results.passed.push('Main→Renderer: update-checking');
        });

        // Test 1.2: update-available event
        let availableReceived = false;
        window.electron.onUpdateAvailable((info) => {
            availableReceived = true;
            this.log(`update-available received: ${JSON.stringify(info)}`);
            
            // Verify data structure
            if (info.version && typeof info.version === 'string') {
                this.log('✓ info.version exists and is string');
                this.results.passed.push('Main→Renderer: update-available data structure');
            } else {
                this.log('✗ info.version missing or invalid', true);
                this.results.failed.push('Main→Renderer: update-available data structure');
            }
        });

        // Test 1.3: update-not-available event
        let notAvailableReceived = false;
        window.electron.onUpdateNotAvailable((info) => {
            notAvailableReceived = true;
            this.log('update-not-available event received');
            this.results.passed.push('Main→Renderer: update-not-available');
        });

        // Test 1.4: update-error event
        let errorReceived = false;
        window.electron.onUpdateError((error) => {
            errorReceived = true;
            this.log(`update-error received: ${error.message}`);
            if (error.message) {
                this.results.passed.push('Main→Renderer: update-error');
            }
        });

        // Test 1.5: update-download-progress event
        let progressReceived = false;
        window.electron.onUpdateDownloadProgress((progress) => {
            if (!progressReceived) {
                progressReceived = true;
                this.log(`update-download-progress received: ${progress.percent}%`);
                
                // Verify data structure
                if (typeof progress.percent === 'number' && 
                    typeof progress.bytesPerSecond === 'number' &&
                    typeof progress.transferred === 'number' &&
                    typeof progress.total === 'number') {
                    this.log('✓ Progress data structure valid');
                    this.results.passed.push('Main→Renderer: update-download-progress');
                } else {
                    this.log('✗ Progress data structure invalid', true);
                    this.results.failed.push('Main→Renderer: update-download-progress');
                }
            }
        });

        // Test 1.6: update-downloaded event
        let downloadedReceived = false;
        window.electron.onUpdateDownloaded((info) => {
            downloadedReceived = true;
            this.log(`update-downloaded received: ${info.version}`);
            if (info.version) {
                this.results.passed.push('Main→Renderer: update-downloaded');
            }
        });

        // Test 1.7: update-dismissed event
        let dismissedReceived = false;
        window.electron.onUpdateDismissed(() => {
            dismissedReceived = true;
            this.log('update-dismissed event received');
            this.results.passed.push('Main→Renderer: update-dismissed');
        });

        this.log('\nEvent listeners registered. Waiting for events...');
        this.log('Trigger events by: clicking update buttons, or manually checking for updates');
    },

    async testRendererToMain() {
        console.log('\n=== Testing Renderer → Main Actions ===\n');

        // Test 2.1: check-for-updates-manual
        try {
            this.log('Testing manual update check...');
            const result = await window.electron.checkForUpdates();
            if (result !== undefined) {
                this.log('✓ checkForUpdates() handler responded');
                this.log(`Response: ${JSON.stringify(result)}`);
                this.results.passed.push('Renderer→Main: check-for-updates-manual');
            } else {
                this.log('✗ No response from checkForUpdates()', true);
                this.results.failed.push('Renderer→Main: check-for-updates-manual');
            }
        } catch (error) {
            this.log(`✗ checkForUpdates() error: ${error.message}`, true);
            this.results.failed.push('Renderer→Main: check-for-updates-manual');
        }

        // Test 2.2: update-download-now
        try {
            this.log('\nTesting download trigger...');
            window.electron.downloadUpdate();
            this.log('✓ downloadUpdate() called (will trigger download if update available)');
            this.results.passed.push('Renderer→Main: update-download-now');
        } catch (error) {
            this.log(`✗ downloadUpdate() error: ${error.message}`, true);
            this.results.failed.push('Renderer→Main: update-download-now');
        }

        // Test 2.3: update-install-now
        try {
            this.log('\nTesting install trigger (NOT executing - would close app)...');
            // Don't actually call installUpdate() as it will close the app
            if (typeof window.electron.installUpdate === 'function') {
                this.log('✓ installUpdate() function exists');
                this.results.passed.push('Renderer→Main: update-install-now (exists)');
            } else {
                this.log('✗ installUpdate() function missing', true);
                this.results.failed.push('Renderer→Main: update-install-now');
            }
        } catch (error) {
            this.log(`✗ installUpdate() error: ${error.message}`, true);
            this.results.failed.push('Renderer→Main: update-install-now');
        }

        // Test 2.4: update-remind-later
        try {
            this.log('\nTesting remind later...');
            window.electron.remindLater();
            this.log('✓ remindLater() called');
            this.results.passed.push('Renderer→Main: update-remind-later');
        } catch (error) {
            this.log(`✗ remindLater() error: ${error.message}`, true);
            this.results.failed.push('Renderer→Main: update-remind-later');
        }
    },

    testIPCSecurity() {
        console.log('\n=== Testing IPC Security ===\n');

        // Test 3.1: Verify only whitelisted channels
        const expectedAPIs = [
            'checkForUpdates',
            'onUpdateChecking',
            'onUpdateAvailable',
            'onUpdateNotAvailable',
            'onUpdateError',
            'onUpdateDownloadProgress',
            'onUpdateDownloaded',
            'onUpdateDismissed',
            'downloadUpdate',
            'installUpdate',
            'remindLater'
        ];

        let allPresent = true;
        expectedAPIs.forEach(api => {
            if (window.electron[api]) {
                this.log(`✓ ${api} is exposed`);
            } else {
                this.log(`✗ ${api} is missing`, true);
                allPresent = false;
            }
        });

        if (allPresent) {
            this.results.passed.push('IPC Security: All expected APIs present');
        } else {
            this.results.failed.push('IPC Security: Some APIs missing');
        }

        // Test 3.2: Verify require() not accessible
        try {
            if (typeof require === 'undefined') {
                this.log('✓ require() not accessible (good!)');
                this.results.passed.push('IPC Security: require() not accessible');
            } else {
                this.log('✗ require() is accessible (security risk!)', true);
                this.results.failed.push('IPC Security: require() accessible');
            }
        } catch (e) {
            this.log('✓ require() not accessible (good!)');
            this.results.passed.push('IPC Security: require() not accessible');
        }

        // Test 3.3: Verify process not accessible
        try {
            if (typeof process === 'undefined' || !process.versions) {
                this.log('✓ process is not fully accessible (good!)');
                this.results.passed.push('IPC Security: process not accessible');
            } else {
                this.log('✗ process is accessible (potential security risk!)', true);
                this.results.failed.push('IPC Security: process accessible');
            }
        } catch (e) {
            this.log('✓ process not accessible (good!)');
            this.results.passed.push('IPC Security: process not accessible');
        }
    },

    printSummary() {
        console.log('\n=== TEST SUMMARY ===\n');
        console.log(`Total Passed: ${this.results.passed.length}`);
        console.log(`Total Failed: ${this.results.failed.length}`);
        
        if (this.results.passed.length > 0) {
            console.log('\n✅ PASSED TESTS:');
            this.results.passed.forEach(test => console.log(`  - ${test}`));
        }
        
        if (this.results.failed.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.failed.forEach(test => console.log(`  - ${test}`));
        }

        console.log('\n' + '='.repeat(50));
    },

    async runAll() {
        console.log('🧪 IPC Channel Integration Tests');
        console.log('='.repeat(50));
        
        this.testIPCSecurity();
        await this.testMainToRenderer();
        await this.testRendererToMain();
        
        this.printSummary();
        
        return {
            passed: this.results.passed.length,
            failed: this.results.failed.length,
            details: this.results
        };
    }
};

// Export for use in console
if (typeof window !== 'undefined') {
    window.IPCTests = IPCTests;
    console.log('\n✨ IPC Tests loaded!');
    console.log('Run: IPCTests.runAll()');
    console.log('Or run individual tests:');
    console.log('  - IPCTests.testIPCSecurity()');
    console.log('  - IPCTests.testMainToRenderer()');
    console.log('  - IPCTests.testRendererToMain()');
}
