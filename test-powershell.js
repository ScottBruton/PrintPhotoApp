const { spawn } = require('child_process');
const path = require('path');

// Path to the PowerShell script
const psScriptPath = "C:\\Users\\bruto\\AppData\\Local\\Temp\\UpdateScript.ps1";
const installerPath = "C:\\Users\\bruto\\AppData\\Local\\Temp\\PrintPhotoApp-Setup.exe";

console.log('Starting PowerShell test...');
console.log('Script path:', psScriptPath);
console.log('Installer path:', installerPath);

// Create PowerShell process
const ps = spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', psScriptPath,
    '-InstallerPath', installerPath
], {
    stdio: 'pipe',
    windowsHide: false
});

// Handle PowerShell output
ps.stdout.on('data', (data) => {
    console.log('PowerShell output:', data.toString());
});

// Handle PowerShell errors
ps.stderr.on('data', (data) => {
    console.error('PowerShell error:', data.toString());
});

// Handle process exit
ps.on('close', (code) => {
    console.log('PowerShell process exited with code:', code);
});

// Handle process errors
ps.on('error', (err) => {
    console.error('Failed to start PowerShell:', err);
}); 