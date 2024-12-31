class PrintManager {
    constructor() {
        this.dialog = null;
        this.previewContent = null;
        this.currentSettings = {
            printer: '',
            copies: 1,
            layout: 'portrait',
            pages: 'all',
            pageRanges: '',
            color: true,
            zoom: 100
        };
        this.printerList = [];
        this.toastContainer = null;
        
        // Initialize toast container immediately
        this.setupToastContainer();
        console.log('Toast container initialized:', this.toastContainer);  // Debug log
    }

    async showPrintDialog(contentToprint) {
        // Create and append the dialog if it doesn't exist
        if (!this.dialog) {
            this.createPrintDialog();
        }

        // Clone the content and prepare it for printing
        const preparedContent = this.prepareContent(contentToprint);
        
        // Show the dialog
        this.dialog.style.display = 'flex';
        
        // Set the preview content
        this.previewContent.innerHTML = '';
        this.previewContent.appendChild(preparedContent);

        // Get available printers
        await this.refreshPrinters();

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    createPrintDialog() {
        this.dialog = document.createElement('div');
        this.dialog.className = 'print-dialog-overlay';
        this.dialog.innerHTML = `
            <div class="print-dialog">
                <div class="print-settings">
                    <h2>Print Settings</h2>
                    
                    <!-- Printer Selection -->
                    <div class="settings-section">
                        <div class="section-header">
                            <h3>Printer</h3>
                            <button class="refresh-btn" id="refreshPrinters">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <div class="printer-search">
                            <input type="text" placeholder="Search printers..." id="printerSearch">
                        </div>
                        <select id="printerSelect" class="printer-list"></select>
                    </div>

                    <!-- Copies -->
                    <div class="settings-section">
                        <h3>Copies</h3>
                        <div class="copies-input">
                            <input type="number" min="1" value="1" id="copiesInput">
                        </div>
                    </div>

                    <!-- Layout -->
                    <div class="settings-section">
                        <h3>Layout</h3>
                        <div class="layout-options">
                            <label>
                                <input type="radio" name="layout" value="portrait" checked>
                                Portrait
                            </label>
                            <label>
                                <input type="radio" name="layout" value="landscape">
                                Landscape
                            </label>
                        </div>
                    </div>

                    <!-- Quality -->
                    <div class="settings-section">
                        <h3>Quality</h3>
                        <div class="quality-settings">
                            <select id="printQuality" class="quality-select">
                                <option value="600">High Quality (600 DPI)</option>
                                <option value="300">Normal (300 DPI)</option>
                                <option value="150">Draft (150 DPI)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Pages -->
                    <div class="settings-section">
                        <h3>Pages</h3>
                        <div class="pages-options">
                            <label>
                                <input type="radio" name="pages" value="all" checked>
                                All
                            </label>
                            <label>
                                <input type="radio" name="pages" value="custom">
                                Custom
                            </label>
                            <input type="text" class="page-ranges" placeholder="e.g. 1-5, 8, 11-13" disabled>
                        </div>

                    <!-- Paper Type -->
                    <div class="settings-section">
                        <h3>Paper Type</h3>
                        <div class="paper-type-options">
                            <label>
                                <input type="radio" name="paperType" value="plain" checked>
                                <span>Plain Paper</span>
                            </label>
                            <label>
                                <input type="radio" name="paperType" value="glossy">
                                <span>Gloss Paper</span>
                            </label>
                            <label>
                                <input type="radio" name="paperType" value="photo">
                                <span>Photo Paper</span>
                            </label>
                        </div>
                    </div>

                        <!-- Action Buttons -->
                    <div class="dialog-actions">
                        <button class="cancel-btn" id="cancelPrint">Cancel</button>
                        <button class="print-btn" id="confirmPrint">Print</button>
                    </div>
                    </div>

                    
                </div>

                <div class="print-preview">
                    <div class="preview-toolbar">
                        <button id="zoomOut"><i class="fas fa-search-minus"></i></button>
                        <span id="zoomLevel">100%</span>
                        <button id="zoomIn"><i class="fas fa-search-plus"></i></button>
                    </div>
                    <div id="previewContent" class="preview-content"></div>
                </div>
            </div>
        `;

        // Store preview content reference
        this.previewContent = this.dialog.querySelector('#previewContent');

        // Add event listeners
        this.setupEventListeners();

        // Add to document
        document.body.appendChild(this.dialog);

        // Initialize preview
        this.initializePreview();
    }

    setupEventListeners() {
        // Printer search
        this.dialog.querySelector('#printerSearch').addEventListener('input', (e) => {
            this.filterPrinters(e.target.value);
        });

        // Refresh printers
        this.dialog.querySelector('#refreshPrinters').addEventListener('click', () => {
            this.refreshPrinters();
        });

        // Print button
        this.dialog.querySelector('#confirmPrint').addEventListener('click', () => {
            this.executePrint();
        });

        // Cancel button
        this.dialog.querySelector('#cancelPrint').addEventListener('click', () => {
            this.closeDialog(false);
        });

        // Zoom controls
        this.dialog.querySelector('#zoomIn').addEventListener('click', () => {
            this.zoom(10);
        });

        this.dialog.querySelector('#zoomOut').addEventListener('click', () => {
            this.zoom(-10);
        });

        // Page range toggle
        const pageRadios = this.dialog.querySelectorAll('input[name="pages"]');
        const pageRangeInput = this.dialog.querySelector('.page-ranges');
        pageRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                pageRangeInput.disabled = e.target.value === 'all';
            });
        });
    }

    prepareContent(content) {
        const clone = content.cloneNode(true);
        
        // Remove empty placeholders
        clone.querySelectorAll('.photo-placeholder:not(:has(img))').forEach(p => p.remove());
        
        // Remove edit overlays
        clone.querySelectorAll('.edit-overlay').forEach(o => o.remove());
        
        // Remove placeholder styling
        clone.querySelectorAll('.photo-placeholder').forEach(p => {
            p.style.border = 'none';
            p.style.background = 'none';
        });

        return clone;
    }

    async refreshPrinters() {
        this.printerList = await window.electron.getPrinters();
        const select = this.dialog.querySelector('#printerSelect');
        select.innerHTML = this.printerList
            .map(printer => `<option value="${printer.name}">${printer.displayName || printer.name}</option>`)
            .join('');

        // Add printer selection change handler
        select.addEventListener('change', (e) => {
            const isPDF = e.target.value === 'Save as PDF';
            this.dialog.querySelector('#copiesInput').disabled = isPDF;
            if (isPDF) {
                this.dialog.querySelector('#copiesInput').value = 1;
            }
        });
    }

    filterPrinters(searchTerm) {
        const select = this.dialog.querySelector('#printerSelect');
        const filtered = this.printerList.filter(printer => 
            printer.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        select.innerHTML = filtered
            .map(printer => `<option value="${printer.name}">${printer.name}</option>`)
            .join('');
    }

    zoom(delta) {
        this.currentSettings.zoom = Math.max(25, Math.min(200, this.currentSettings.zoom + delta));
        this.dialog.querySelector('#zoomLevel').textContent = `${this.currentSettings.zoom}%`;
        
        // Calculate scale based on container size
        const previewContent = this.dialog.querySelector('.preview-content');
        const page = this.dialog.querySelector('.a4-page');
        
        if (page) {
            const scale = (this.currentSettings.zoom / 100) * 0.8; // Base scale is 0.8
            page.style.setProperty('--preview-scale', scale);
        }
    }

    initializePreview() {
        const previewContent = this.dialog.querySelector('.preview-content');
        const page = previewContent.querySelector('.a4-page');
        
        if (page) {
            // Set initial scale to fit container
            page.style.setProperty('--preview-scale', '0.8');
        }
    }

    setupToastContainer() {
        if (!this.toastContainer) {  // Check if it already exists
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
            console.log('Created new toast container');  // Debug log
        }
    }

    showToast(message) {
        console.log('Creating toast with message:', message);  // Debug log
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        console.log('Toast container:', this.toastContainer);  // Debug log
        this.toastContainer.appendChild(toast);

        // Remove the toast after animation
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    async executePrint() {
        // Gather all settings
        const settings = {
            printer: this.dialog.querySelector('#printerSelect').value,
            copies: parseInt(this.dialog.querySelector('#copiesInput').value),
            layout: this.dialog.querySelector('input[name="layout"]:checked').value,
            pages: this.dialog.querySelector('input[name="pages"]:checked').value,
            pageRanges: this.dialog.querySelector('.page-ranges').value,
            quality: parseInt(this.dialog.querySelector('#printQuality').value),
            paperType: this.dialog.querySelector('input[name="paperType"]:checked').value
        };

        console.log('Print settings:', settings);  // Debug log

        // Close the print dialog before sending to print
        this.dialog.style.display = 'none';

        // Send to print
        const success = await window.electron.print(this.previewContent.innerHTML, settings);
        console.log('Print success:', success);  // Debug log
        console.log('Printer type:', settings.printer);  // Debug log
        
        // Show toast for successful print jobs (including Test Printer)
        if (success && settings.printer !== 'Save as PDF') {
            console.log('Showing toast message');  // Debug log
            this.showToast(`Successfully sent to printer: ${settings.printer}`);
        }

        // Only call closeDialog if print was unsuccessful
        if (!success) {
            this.closeDialog(success);
        } else {
            // Just resolve the promise
            if (this.resolvePromise) {
                this.resolvePromise(success);
            }
        }
    }

    closeDialog(success) {
        this.dialog.style.display = 'none';
        if (this.resolvePromise) {
            this.resolvePromise(success);
        }
    }
}

// Export the PrintManager
window.PrintManager = PrintManager; 

// Add this right after the PrintManager class definition but before the export
window.testToast = function() {
    const manager = new PrintManager();
    manager.showToast('Test Message');
} 