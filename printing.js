class PrintManager {
    constructor() {
        this.dialog = null;
        this.printPreview = null;
        this.currentSettings = {
            printer: '',
            copies: 1,
            layout: 'portrait',
            pages: 'all',
            pageRanges: '',
            color: true
        };
        this.printerList = [];
        this.toastContainer = null;
        
        this.setupToastContainer();
    }

    async showPrintDialog(contentToprint) {
        if (!this.dialog) {
            this.createPrintDialog();
        }

        // Initialize print preview if not already done
        if (!this.printPreview) {
            this.printPreview = new PrintPreview();
        }

        // Show the dialog
        this.dialog.style.display = 'flex';
        
        // Get all pages
        const pages = this.getAllPages();
        
        // Set the pages in the preview
        this.printPreview.setPages(pages);

        // Get available printers
        await this.refreshPrinters();

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    createPrintDialog() {
        this.dialog = document.createElement('div');
        this.dialog.className = 'print-dialog-overlay';
        
        // Create the print preview instance
        this.printPreview = new PrintPreview();
        
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

                        <!-- Action Buttons -->
                    <div class="dialog-actions">
                        <button class="cancel-btn" id="cancelPrint">Cancel</button>
                        <button class="print-btn" id="confirmPrint">Print</button>
                    </div>
                    </div>

                    
                </div>
            </div>
        `;

        // Get the print dialog element and insert the preview
        const printDialog = this.dialog.querySelector('.print-dialog');
        printDialog.appendChild(this.printPreview.getElement());

        // Add event listeners
        this.setupEventListeners();

        // Add to document
        document.body.appendChild(this.dialog);
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
            page.style.setProperty('--preview-scale', '0.5');
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
            paperType: this.dialog.querySelector('input[name="paperType"]:checked').value,
            selectedPage: this.printPreview ? this.printPreview.getCurrentPage() : 0
        };

        // Close the print dialog before sending to print
        this.dialog.style.display = 'none';

        // Send to print
        window.electron.print(this.printPreview.previewContent.innerHTML, settings)
            .then(success => {
                if (success && settings.printer !== 'Save as PDF') {
                    this.showToast(`Successfully sent to printer: ${settings.printer}`);
                }
                this.closeDialog(success);
            });
    }

    closeDialog(success) {
        this.dialog.style.display = 'none';
        if (this.resolvePromise) {
            this.resolvePromise(success);
        }
    }

    getAllPages() {
        // Get all pages from the document
        const pages = [];
        const pageContainer = document.getElementById('pageContainer');
        
        if (pageContainer) {
            // Get all A4 pages
            const a4Pages = pageContainer.querySelectorAll('.a4-page');
            a4Pages.forEach(page => {
                pages.push(page);
            });
        }
        
        return pages;
    }
}

// Export the PrintManager
window.PrintManager = PrintManager;

// Add this right after the PrintManager class definition but before the export
window.testToast = function() {
    const manager = new PrintManager();
    manager.showToast('Test Message');
} 