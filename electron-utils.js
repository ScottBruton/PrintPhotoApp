const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const os = require("os");


function setupIpcHandlers() {
    // Handler for saving HTML to temp file
    ipcMain.handle('save-temp-html', async (event, html) => {
        try {           
            // Use system temp directory
            const tempPath = path.join(os.tmpdir(), 'currentLayout.html');
            
            // Write directly to temp directory
            await fs.writeFile(tempPath, html, 'utf8');
            console.log('Saved layout HTML to:', tempPath);
            
            return tempPath; // Return the path where the file was saved
        } catch (error) {
            console.error('Error saving temp HTML:', error);
            throw error; // Propagate error to renderer
        }
    });
}

module.exports = {
    setupIpcHandlers
}; 