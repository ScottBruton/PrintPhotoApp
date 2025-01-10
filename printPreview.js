class PrintPreview {
    constructor(editor) {
        this.editor = editor;
        this.previewContent = null;
        this.currentSettings = {
            zoom: 100,
            currentPage: 0
        };
        this.pages = [];
        this.createPreviewElement();
        this.setupResizeObserver();
    }

    createPreviewElement() {
        const previewElement = document.createElement('div');
        previewElement.className = 'print-preview';
        previewElement.innerHTML = `
            <div class="preview-toolbar">
                <div class="preview-controls">
                    <button id="prevPreviewPage" class="nav-btn" disabled><i class="fas fa-chevron-left"></i></button>
                    <span id="previewPageIndicator">Page 1 of 1</span>
                    <button id="nextPreviewPage" class="nav-btn" disabled><i class="fas fa-chevron-right"></i></button>
                </div>
                <div class="zoom-controls">
                    <button id="zoomOut"><i class="fas fa-search-minus"></i></button>
                    <span id="zoomLevel">100%</span>
                    <button id="zoomIn"><i class="fas fa-search-plus"></i></button>
                    <button id="fitToScreen"><i class="fas fa-expand"></i></button>
                </div>
            </div>
            <div id="previewContent" class="preview-content"></div>
        `;

        this.element = previewElement;
        this.previewContent = previewElement.querySelector('#previewContent');
        this.setupEventListeners();
    }

    setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') {
            console.warn('ResizeObserver not supported in this browser');
            return;
        }

        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.target === this.previewContent) {
                    // Only adjust if we're in auto-fit mode
                    if (this.currentSettings.zoom === 'auto') {
                        this.fitToScreen();
                    }
                }
            }
        });

        if (this.previewContent) {
            this.resizeObserver.observe(this.previewContent);
        }
    }

    setupEventListeners() {
        const zoomIn = this.element.querySelector('#zoomIn');
        const zoomOut = this.element.querySelector('#zoomOut');
        const fitToScreen = this.element.querySelector('#fitToScreen');
        const prevPage = this.element.querySelector('#prevPreviewPage');
        const nextPage = this.element.querySelector('#nextPreviewPage');

        zoomIn.addEventListener('click', () => this.zoom(10));
        zoomOut.addEventListener('click', () => this.zoom(-10));
        fitToScreen.addEventListener('click', () => this.fitToScreen());
        prevPage.addEventListener('click', () => this.navigatePage(-1));
        nextPage.addEventListener('click', () => this.navigatePage(1));

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    this.zoom(10);
                } else if (e.key === '-') {
                    e.preventDefault();
                    this.zoom(-10);
                } else if (e.key === '0') {
                    e.preventDefault();
                    this.fitToScreen();
                }
            } else if (e.key === 'ArrowLeft') {
                this.navigatePage(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigatePage(1);
            }
        });
    }

    navigatePage(direction) {
        const newPage = this.currentSettings.currentPage + direction;
        if (newPage >= 0 && newPage < this.pages.length) {
            this.currentSettings.currentPage = newPage;
            this.showCurrentPage();
            this.updatePageIndicator();
            this.updateNavigationButtons();
        }
    }

    updatePageIndicator() {
        const indicator = this.element.querySelector('#previewPageIndicator');
        const totalPages = this.pages.length;
        const currentPage = this.currentSettings.currentPage + 1;
        indicator.textContent = `Page ${currentPage} of ${totalPages}`;
        console.log(`Page indicator updated: ${currentPage} of ${totalPages}`);
    }

    updateNavigationButtons() {
        const prevBtn = this.element.querySelector('#prevPreviewPage');
        const nextBtn = this.element.querySelector('#nextPreviewPage');
        
        prevBtn.disabled = this.currentSettings.currentPage === 0;
        nextBtn.disabled = this.currentSettings.currentPage === this.pages.length - 1;
    }

    showCurrentPage() {
        console.log('Showing current page:', this.currentSettings.currentPage);
        const currentPage = this.pages[this.currentSettings.currentPage];
        console.log('Current page content:', currentPage);
        
        if (currentPage) {
            this.previewContent.innerHTML = '';
            
            // Create a container for the page
            const pageContainer = document.createElement('div');
            pageContainer.className = 'preview-page-container';
            
            // Clone and prepare the page content
            const preparedPage = this.prepareContent(currentPage);
            console.log('Prepared page:', preparedPage);
            
            pageContainer.appendChild(preparedPage);
            this.previewContent.appendChild(pageContainer);
            
            // Apply zoom settings
            if (this.currentSettings.zoom === 'auto') {
                this.fitToScreen();
            } else {
                this.updateZoom();
            }
            
            this.updateNavigationButtons();
        }
    }

    setPages(pages) {
        console.log('Setting pages:', pages);
        this.pages = Array.from(pages);
        console.log('Stored pages:', this.pages);
        this.currentSettings.currentPage = 0;
        this.updatePageIndicator();
        this.showCurrentPage();
    }

    fitToScreen() {
        const page = this.previewContent.querySelector('.a4-page');
        if (!page || !this.previewContent) return;

        // Get container dimensions (accounting for padding)
        const containerWidth = this.previewContent.clientWidth - 40;
        const containerHeight = this.previewContent.clientHeight - 40;

        // Get page dimensions (in pixels)
        const pageWidth = 210 * 3.7795275591; // Convert mm to pixels (1mm = 3.7795275591px)
        const pageHeight = 297 * 3.7795275591;

        // Calculate scale to fit width and maintain aspect ratio
        const scale = containerWidth / pageWidth;

        // Update zoom settings
        this.currentSettings.zoom = 'auto';
        
        // Apply transform to maintain aspect ratio
        page.style.transform = `scale(${scale})`;
        this.element.querySelector('#zoomLevel').textContent = `${Math.round(scale * 100)}%`;
    }

    zoom(delta) {
        if (this.currentSettings.zoom === 'auto') {
            // If currently in auto mode, switch to manual with current scale
            const page = this.previewContent.querySelector('.a4-page');
            if (page) {
                const transform = page.style.transform;
                const currentScale = transform ? parseFloat(transform.match(/scale\((.*?)\)/)[1]) : 1;
                this.currentSettings.zoom = Math.round(currentScale * 100);
            }
        }

        const currentZoom = parseFloat(this.currentSettings.zoom) || 100;
        const newZoom = Math.max(25, Math.min(200, currentZoom + delta));
        
        if (newZoom !== currentZoom) {
            this.currentSettings.zoom = newZoom;
            this.updateZoom();
        }
    }

    updateZoom() {
        const zoomLevel = this.element.querySelector('#zoomLevel');
        const page = this.previewContent.querySelector('.a4-page');
        
        if (zoomLevel && page) {
            const scale = this.currentSettings.zoom / 100;
            zoomLevel.textContent = `${Math.round(this.currentSettings.zoom)}%`;
            page.style.transform = `scale(${scale})`;
        }
    }

    prepareContent(content) {
        console.log('Preparing content:', content);
        const clone = content.cloneNode(true);
        clone.dataset.pageNumber = this.currentSettings.currentPage + 1;
        
        // Ensure the clone maintains the a4-page class and styles
        if (content.classList.contains('a4-page')) {
            clone.style.background = 'white';
            clone.style.margin = '0';
            clone.style.padding = '5mm';
            clone.style.height = '297mm';
            clone.style.width = '210mm';
            clone.style.position = 'relative';
            clone.style.transformOrigin = 'top left';
        }
        
        // Process photo placeholders
        clone.querySelectorAll('.photo-placeholder').forEach(placeholder => {
            if (placeholder.querySelector('img')) {
                // Keep essential styles
                placeholder.style.position = 'absolute';
                placeholder.style.background = 'none';
                placeholder.style.border = 'none';
                placeholder.style.boxShadow = 'none';
            } else {
                placeholder.remove();
            }
        });

        // Process images
        clone.querySelectorAll('.photo-placeholder img').forEach(img => {
            const placeholder = img.closest('.photo-placeholder');
            if (placeholder) {
                const cardId = placeholder.id;
                const pageNumber = this.currentSettings.currentPage + 1;
                const cardImage = this.editor.sessionManager.getCardImage(pageNumber, cardId);
                
                if (cardImage) {
                    const container = document.createElement('div');
                    container.className = 'image-container';
                    container.style.width = '100%';
                    container.style.height = '100%';
                    container.style.position = 'relative';
                    
                    img.style.width = cardImage.width;
                    img.style.height = cardImage.height;
                    img.style.objectFit = cardImage.objectFit;
                    img.style.position = 'absolute';
                    img.style.left = '50%';
                    img.style.top = '50%';
                    img.style.transform = `translate(-50%, -50%) rotate(${cardImage.rotation}deg) scale(${cardImage.zoom / 100})`;
                    
                    img.parentNode.replaceChild(container, img);
                    container.appendChild(img);
                }
            }
        });

        return clone;
    }

    getElement() {
        return this.element;
    }

    getCurrentPage() {
        return this.currentSettings.currentPage;
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

// Export the PrintPreview
window.PrintPreview = PrintPreview; 