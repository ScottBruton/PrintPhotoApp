const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting Python build process...');

// Run PyInstaller
exec('pyinstaller --onefile --clean print_handler.py', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error during PyInstaller execution: ${error}`);
        return;
    }
    console.log('PyInstaller output:', stdout);
    
    // Verify the file was created
    const exePath = path.join(__dirname, 'dist', 'print_handler.exe');
    if (fs.existsSync(exePath)) {
        console.log(`Successfully created executable at: ${exePath}`);
    } else {
        console.error('Executable was not created at expected path:', exePath);
    }
}); 