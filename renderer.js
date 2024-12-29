window.onerror = function(message, source, lineno, colno, error) {
    console.error('Renderer Error:', {
        message,
        source,
        lineno,
        colno,
        error: error?.stack || error
    });
};

// Add this for promise errors
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
});

class PhotoLayoutEditor {
    constructor() {
        this.pages = [{ id: 1, size: null, photos: [] }];
        this.currentPage = 0;
        this.commandHistory = [];
        this.commandIndex = -1;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.pageContainer = document.getElementById('a4Page');
        this.modal = document.getElementById('sizeModal');
        this.addPageBtn = document.getElementById('addPage');
        this.prevPageBtn = document.getElementById('prevPage');
        this.nextPageBtn = document.getElementById('nextPage');
        this.pageIndicator = document.getElementById('pageIndicator');
        
        // Show size selection modal on start
        this.showSizeModal();
    }

    bindEvents() {
        this.addPageBtn.addEventListener('click', () => this.addNewPage());
        this.prevPageBtn.addEventListener('click', () => this.navigatePage(-1));
        this.nextPageBtn.addEventListener('click', () => this.navigatePage(1));
        
        // Bind size selection buttons
        document.querySelectorAll('.size-options button').forEach(button => {
            button.addEventListener('click', (e) => {
                const size = e.target.dataset.size;
                this.setPageSize(size);
                this.modal.style.display = 'none';
            });
        });

        // Setup drag and drop
        this.setupDragAndDrop();

        // Add new event listeners
        document.getElementById('saveLayout').addEventListener('click', () => this.saveLayout());
        document.getElementById('loadLayout').addEventListener('click', () => this.loadLayout());
        document.getElementById('exportPDF').addEventListener('click', () => this.exportToPDF());
        document.getElementById('printPreview').addEventListener('click', () => this.showPrintPreview());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('redo').addEventListener('click', () => this.redo());
    }

    setPageSize(size) {
        this.pages[this.currentPage].size = size;
        this.createPhotoPlaceholders(size);
    }

    createPhotoPlaceholders(size) {
        // Clear existing placeholders
        this.pageContainer.innerHTML = '';
        
        let [width, height] = size.split('x').map(n => parseInt(n));
        
        // Define page dimensions and spacing in millimeters
        const PAGE_WIDTH = 210;  // A4 width in mm
        const PAGE_HEIGHT = 297; // A4 height in mm
        const MARGIN = 5;        // 5mm margin
        const SPACING = 10;      // 10mm spacing
        
        // Calculate how many cards can fit
        const availableWidth = PAGE_WIDTH - (2 * MARGIN);
        const availableHeight = PAGE_HEIGHT - (2 * MARGIN);
        
        const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
        const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));
        
        // Start from top-left with margin
        const startX = MARGIN;
        const startY = MARGIN;

        // Create grid of placeholders
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const placeholder = document.createElement('div');
                placeholder.className = 'photo-placeholder';
                
                // Calculate position in mm
                const x = startX + (col * (width + SPACING));
                const y = startY + (row * (height + SPACING));
                
                // Apply styles using mm units
                Object.assign(placeholder.style, {
                    width: `${width}mm`,
                    height: `${height}mm`,
                    left: `${x}mm`,
                    top: `${y}mm`,
                    position: 'absolute'
                });
                
                this.pageContainer.appendChild(placeholder);
            }
        }
    }

    setupDragAndDrop() {
        this.pageContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.pageContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                const target = e.target.closest('.photo-placeholder');
                if (target) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.addImageToPlaceholder(target, e.target.result);
                    };
                    reader.readAsDataURL(files[0]);
                }
            }
        });
    }

    addImageToPlaceholder(placeholder, imageData) {
        const container = document.createElement('div');
        container.className = 'image-container';
        
        const img = document.createElement('img');
        img.src = imageData;
        
        const editOverlay = document.createElement('div');
        editOverlay.className = 'edit-overlay';
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.innerHTML = '✎';
        editButton.onclick = () => this.setupImageEditor(container);
        editOverlay.appendChild(editButton);
        
        container.appendChild(img);
        placeholder.innerHTML = '';
        placeholder.appendChild(container);
        placeholder.appendChild(editOverlay);
        
        // Initial fit
        this.fitImageToContainer(img, container);
    }

    fitImageToContainer(img, container) {
        img.onload = () => {
            const containerAspect = container.offsetWidth / container.offsetHeight;
            const imageAspect = img.naturalWidth / img.naturalHeight;
            
            if (containerAspect > imageAspect) {
                img.style.width = '100%';
                img.style.height = 'auto';
            } else {
                img.style.width = 'auto';
                img.style.height = '100%';
            }
            
            // Center the image
            img.style.left = '50%';
            img.style.top = '50%';
            img.style.transform = 'translate(-50%, -50%)';
        };
    }

    showSizeModal() {
        this.modal.style.display = 'block';
    }

    addNewPage() {
        this.pages.push({ id: this.pages.length + 1, size: null, photos: [] });
        this.currentPage = this.pages.length - 1;
        this.updatePageIndicator();
        this.showSizeModal();
    }

    navigatePage(direction) {
        const newPage = this.currentPage + direction;
        if (newPage >= 0 && newPage < this.pages.length) {
            this.currentPage = newPage;
            this.updatePageIndicator();
            if (this.pages[this.currentPage].size) {
                this.createPhotoPlaceholders(this.pages[this.currentPage].size);
            }
        }
    }

    updatePageIndicator() {
        this.pageIndicator.textContent = `Page ${this.currentPage + 1} of ${this.pages.length}`;
    }

    executeCommand(command) {
        command.execute();
        this.commandHistory.splice(this.commandIndex + 1);
        this.commandHistory.push(command);
        this.commandIndex++;
    }

    undo() {
        if (this.commandIndex >= 0) {
            this.commandHistory[this.commandIndex].undo();
            this.commandIndex--;
        }
    }

    redo() {
        if (this.commandIndex < this.commandHistory.length - 1) {
            this.commandIndex++;
            this.commandHistory[this.commandIndex].execute();
        }
    }

    async saveLayout() {
        const layoutData = {
            pages: this.pages,
            currentPage: this.currentPage
        };
        
        const result = await window.electron.invoke('save-layout', layoutData);
        if (result) {
            alert('Layout saved successfully!');
        }
    }

    async loadLayout() {
        const layoutData = await window.electron.invoke('load-layout');
        if (layoutData) {
            this.pages = layoutData.pages;
            this.currentPage = layoutData.currentPage;
            this.updatePageIndicator();
            this.createPhotoPlaceholders(this.pages[this.currentPage].size);
        }
    }

    async exportToPDF() {
        const pdf = new jsPDF();
        
        for (let i = 0; i < this.pages.length; i++) {
            const pageElement = document.getElementById('a4Page');
            const canvas = await html2canvas(pageElement);
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        }
        
        pdf.save('photo-layout.pdf');
    }

    showPrintPreview() {
        const previewModal = document.getElementById('printPreviewModal');
        const previewContent = document.getElementById('printPreviewContent');
        
        // Clone current page for preview
        const pageClone = this.pageContainer.cloneNode(true);
        
        // Clean up the preview content but preserve styles
        pageClone.querySelectorAll('.photo-placeholder:not(:has(img))').forEach(placeholder => placeholder.remove());
        pageClone.querySelectorAll('.edit-overlay').forEach(overlay => overlay.remove());
        
        previewContent.innerHTML = '';
        previewContent.appendChild(pageClone);
        previewModal.style.display = 'block';
        
        document.getElementById('confirmPrint').onclick = async () => {
            console.log('Renderer: Print button clicked');
            previewModal.style.display = 'none';
            
            try {
                // Get computed styles for all elements
                const placeholders = pageClone.querySelectorAll('.photo-placeholder');
                placeholders.forEach(placeholder => {
                    const computedStyle = window.getComputedStyle(placeholder);
                    placeholder.style.width = computedStyle.width;
                    placeholder.style.height = computedStyle.height;
                    placeholder.style.left = computedStyle.left;
                    placeholder.style.top = computedStyle.top;
                    
                    const img = placeholder.querySelector('img');
                    if (img) {
                        const imgComputedStyle = window.getComputedStyle(img);
                        // Preserve all transforms and positioning
                        img.style.transform = imgComputedStyle.transform;
                        img.style.width = imgComputedStyle.width;
                        img.style.height = imgComputedStyle.height;
                        img.style.objectFit = imgComputedStyle.objectFit;
                        img.style.position = 'absolute';
                    }
                });

                console.log('Renderer: Preparing print HTML...');
                const printHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Print Preview</title>
                        <meta charset="utf-8">
                        <style>
                            @page {
                                size: A4;
                                margin: 0;
                            }
                            
                            html, body {
                                margin: 0;
                                padding: 0;
                                width: 210mm;
                                height: 297mm;
                            }
                            
                            .a4-page {
                                width: 210mm;
                                height: 297mm;
                                position: relative;
                                padding: 5mm;
                                box-sizing: border-box;
                                background-color: white;
                            }
                            
                            .photo-placeholder {
                                position: absolute !important;
                                overflow: hidden;
                            }
                            
                            .photo-placeholder img {
                                position: absolute !important;
                                transform-origin: center !important;
                            }

                            @media screen {
                                body {
                                    background: rgb(204,204,204);
                                }
                                .a4-page {
                                    background: white;
                                    margin: 0 auto;
                                    box-shadow: 0 0 0.5cm rgba(0,0,0,0.5);
                                }
                            }

                            @media print {
                                body {
                                    background: none;
                                }
                                .a4-page {
                                    margin: 0;
                                    box-shadow: none;
                                }
                            }
                        </style>
                    </head>
                    <body>
                        ${pageClone.outerHTML}
                    </body>
                    </html>
                `.trim();

                console.log('Renderer: Sending print request to main process...');
                const success = await window.electron.print.preview(printHTML);
                console.log('Renderer: Print result:', success);
                
                if (!success) {
                    console.error('Renderer: Printing failed');
                }
            } catch (error) {
                console.error('Renderer: Print error:', error);
            }
        };
        
        document.getElementById('cancelPrint').onclick = () => {
            previewModal.style.display = 'none';
        };
    }

    // Enhanced image handling with editing features
    setupImageEditor(container) {
        const editorModal = document.getElementById('imageEditorModal');
        const preview = document.getElementById('imageEditorPreview');
        const img = container.querySelector('img');
        const editState = {
            zoom: 100,
            rotation: 0,
            translateX: 0,
            translateY: 0
        };
        
        const history = [];
        let historyIndex = -1;
        
        preview.innerHTML = '';
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-container';
        const imgClone = img.cloneNode(true);
        previewContainer.appendChild(imgClone);
        preview.appendChild(previewContainer);
        
        const saveState = () => {
            history.splice(historyIndex + 1);
            history.push({ ...editState });
            historyIndex++;
        };
        
        const updateImage = () => {
            imgClone.style.transform = `
                translate(-50%, -50%)
                translate(${editState.translateX}px, ${editState.translateY}px)
                rotate(${editState.rotation}deg)
                scale(${editState.zoom / 100})
            `;
        };
        
        // Zoom control
        const zoomInput = document.getElementById('imageZoom');
        zoomInput.oninput = (e) => {
            editState.zoom = parseInt(e.target.value);
            updateImage();
        };
        
        // Rotation control
        const rotationInput = document.getElementById('imageRotation');
        rotationInput.oninput = (e) => {
            editState.rotation = parseInt(e.target.value);
            updateImage();
        };
        
        document.getElementById('rotateLeft').onclick = () => {
            editState.rotation = (editState.rotation - 90 + 360) % 360;
            rotationInput.value = editState.rotation;
            updateImage();
            saveState();
        };
        
        document.getElementById('rotateRight').onclick = () => {
            editState.rotation = (editState.rotation + 90) % 360;
            rotationInput.value = editState.rotation;
            updateImage();
            saveState();
        };
        
        document.getElementById('fitImage').onclick = () => {
            editState.zoom = 100;
            zoomInput.value = 100;
            updateImage();
            saveState();
        };
        
        document.getElementById('fillImage').onclick = () => {
            editState.zoom = 200;
            zoomInput.value = 200;
            updateImage();
            saveState();
        };
        
        document.getElementById('undoEdit').onclick = () => {
            if (historyIndex > 0) {
                historyIndex--;
                Object.assign(editState, history[historyIndex]);
                updateImage();
            }
        };
        
        document.getElementById('redoEdit').onclick = () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                Object.assign(editState, history[historyIndex]);
                updateImage();
            }
        };
        
        document.getElementById('applyChanges').onclick = () => {
            img.style.transform = imgClone.style.transform;
            editorModal.style.display = 'none';
        };
        
        document.getElementById('cancelChanges').onclick = () => {
            editorModal.style.display = 'none';
        };
        
        // Initialize drag functionality
        let isDragging = false;
        let startX, startY;
        
        previewContainer.onmousedown = (e) => {
            isDragging = true;
            startX = e.clientX - editState.translateX;
            startY = e.clientY - editState.translateY;
        };
        
        document.onmousemove = (e) => {
            if (isDragging) {
                editState.translateX = e.clientX - startX;
                editState.translateY = e.clientY - startY;
                updateImage();
            }
        };
        
        document.onmouseup = () => {
            if (isDragging) {
                isDragging = false;
                saveState();
            }
        };
        
        saveState(); // Save initial state
        editorModal.style.display = 'block';
    }
}

// Initialize the editor when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new PhotoLayoutEditor();
}); 