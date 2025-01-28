const { exec } = require('child_process');
const path = require('path');

console.log('Building Python executable...');

// First install pyinstaller and required dependencies
exec('pip install pyinstaller pywin32', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error installing PyInstaller: ${error}`);
        return;
    }
    
    console.log('Installing dependencies:', stdout);

    // Build the executable with all required dependencies
    const pyinstallerCommand = 'pyinstaller --onefile ' + 
                              '--hidden-import win32print ' + 
                              '--hidden-import win32api ' + 
                              '--hidden-import json ' + 
                              '--name print_handler ' + 
                              'print_handler.py';
                              
    exec(pyinstallerCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error building executable: ${error}`);
            return;
        }
        console.log('Build output:', stdout);
        if (stderr) {
            console.log('Build warnings:', stderr);
        }
        console.log('Python executable built successfully!');
    });
}); 