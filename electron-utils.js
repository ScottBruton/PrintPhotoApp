const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');


function setupIpcHandlers() {
    // Handler for saving HTML to temp file
    ipcMain.handle('save-temp-html', async (event, html) => {
        try {
            const tempDir = path.join(__dirname, 'temp');
            // Create temp directory if it doesn't exist
            await fs.mkdir(tempDir, { recursive: true });
            
            const filePath = path.join(tempDir, 'currentLayout.html');
            await fs.writeFile(filePath, html, 'utf8');
            console.log('Saved layout HTML to:', filePath);
            return true;
        } catch (error) {
            console.error('Error saving temp HTML:', error);
            return false;
        }
    });
}

module.exports = {
    setupIpcHandlers
}; 