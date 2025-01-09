// SessionStateManager to handle all session data
class SessionStateManager {
    constructor() {
        this.sessionData = {
            pages: [],
            currentPage: 0
        };
        this.history = [];
        this.currentHistoryIndex = -1;
    }

    // Save current state to history
    saveState(actionName) {
        // Remove any future states if we're in the middle of the history
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentHistoryIndex + 1);
        }
        
        // Save current state
        this.history.push({
            state: JSON.parse(JSON.stringify(this.sessionData)),
            action: actionName
        });
        this.currentHistoryIndex++;
        
        // Limit history size (optional)
        if (this.history.length > 50) {
            this.history.shift();
            this.currentHistoryIndex--;
        }
    }

    // Restore state from history
    restoreState(state) {
        this.sessionData = JSON.parse(JSON.stringify(state));
    }

    // Undo last action
    undo() {
        if (this.currentHistoryIndex > 0) {
            this.currentHistoryIndex--;
            this.restoreState(this.history[this.currentHistoryIndex].state);
            return true;
        }
        return false;
    }

    // Redo last undone action
    redo() {
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.currentHistoryIndex++;
            this.restoreState(this.history[this.currentHistoryIndex].state);
            return true;
        }
        return false;
    }

    // Initialize a new page
    createPage(pageNumber, pageSize) {
        const newPage = {
            pageNumber: pageNumber,
            pageSize: pageSize,
            cards: []
        };
        this.sessionData.pages.push(newPage);
        this.saveState('Create Page');
        return newPage;
    }

    // Add a card to a page
    addCard(pageNumber, cardData) {
        const page = this.getPage(pageNumber);
        if (page) {
            const card = {
                id: `card-${pageNumber}-${page.cards.length}`,
                position: cardData.position,
                size: {
                    width: cardData.width,
                    height: cardData.height
                },
                image: null,
                imageSettings: {
                    rotation: 0,
                    zoom: 100,
                    translateX: 0,
                    translateY: 0,
                    fit: 'contain'
                }
            };
            page.cards.push(card);
            this.saveState('Add Card');
            return card;
        }
        return null;
    }

    // Update card image
    setCardImage(pageNumber, cardId, imageData) {
        const card = this.getCard(pageNumber, cardId);
        if (card) {
            card.image = {
                src: imageData.src,
                originalWidth: imageData.originalWidth,
                originalHeight: imageData.originalHeight
            };
            if (!card.imageSettings) {
                card.imageSettings = {
                    rotation: 0,
                    zoom: 100,
                    translateX: 0,
                    translateY: 0,
                    fit: 'contain'
                };
            }
            this.saveState('Add Image');
            return true;
        }
        return false;
    }

    // Update card image settings
    updateCardImageSettings(pageNumber, cardId, settings) {
        const card = this.getCard(pageNumber, cardId);
        if (card) {
            card.imageSettings = {
                ...card.imageSettings,
                ...settings
            };
            this.saveState('Edit Image');
            return true;
        }
        return false;
    }

    // Get page data
    getPage(pageNumber) {
        return this.sessionData.pages.find(page => page.pageNumber === pageNumber);
    }

    // Get card data
    getCard(pageNumber, cardId) {
        const page = this.getPage(pageNumber);
        if (page) {
            return page.cards.find(card => card.id === cardId);
        }
        return null;
    }

    // Get all cards for a page
    getPageCards(pageNumber) {
        const page = this.getPage(pageNumber);
        return page ? page.cards : [];
    }

    // Get current session state
    getSessionState() {
        return this.sessionData;
    }

    // Load session state
    loadSessionState(state) {
        this.sessionData = JSON.parse(JSON.stringify(state));
    }
}

// Modify your PhotoLayoutEditor class to use SessionStateManager
class PhotoLayoutEditor {
    constructor() {
        this.sessionManager = new SessionStateManager();
        this.initializeElements();
        this.bindEvents();
        // Make the instance globally available
        window.rendererInstance = this;
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
        
        // Add reset button event listener
        document.getElementById('resetProject').addEventListener('click', () => this.resetProject());

        // Add edit size button event listener
        document.getElementById('editSize').addEventListener('click', () => this.showSizeModal(true));
        
        // Add close button event listener for size modal
        document.getElementById('closeSizeModal').addEventListener('click', () => {
            this.modal.style.display = 'none';
            // If this is a new page and no size was selected, remove the page
            if (this.sessionManager.sessionData.pages.length > 0) {
                const currentPage = this.sessionManager.getPage(this.sessionManager.sessionData.currentPage + 1);
                if (!currentPage.pageSize) {
                    this.sessionManager.sessionData.pages.pop();
                    this.sessionManager.sessionData.currentPage = Math.max(0, this.sessionManager.sessionData.pages.length - 1);
                    this.updatePageIndicator();
                }
            }
        });
        
        // Move selectedSize to class property
        this.selectedSize = null;
        const applyToPageBtn = document.getElementById('applyToPage');
        applyToPageBtn.disabled = true;  // Initially disable the button

        // Handle custom size checkbox
        const customSizeCheckbox = document.getElementById('enableCustomSize');
        const customSizeSection = document.getElementById('customSizeSection');
        const customWidthInput = document.getElementById('customWidth');
        const customHeightInput = document.getElementById('customHeight');
        const applyCustomSizeBtn = document.getElementById('applyCustomSize');

        // Validate if a size fits on an A4 page
        const validateSize = (width, height) => {
            const PAGE_WIDTH = 210;
            const PAGE_HEIGHT = 297;
            const MARGIN = 5;
            const SPACING = 10;
            
            const availableWidth = PAGE_WIDTH - (2 * MARGIN);
            const availableHeight = PAGE_HEIGHT - (2 * MARGIN);
            
            const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
            const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));
            
            return cols > 0 && rows > 0;
        };

        // Update preset size button handling
        document.querySelectorAll('.size-options button').forEach(button => {
            button.addEventListener('click', (e) => {
                const [width, height] = e.target.dataset.size.split('x').map(n => parseInt(n));
                
                // Validate size immediately
                if (!validateSize(width, height)) {
                    alert('Selected size is too large for A4 page');
                    return;
                }

                // Uncheck custom size checkbox if a preset is selected
                customSizeCheckbox.checked = false;
                customSizeSection.classList.remove('enabled');
                customWidthInput.disabled = true;
                customHeightInput.disabled = true;
                applyCustomSizeBtn.disabled = true;

                // Update selected size
                this.selectedSize = e.target.dataset.size;
                applyToPageBtn.disabled = false;
                
                // Highlight the selected button
                document.querySelectorAll('.size-options button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                e.target.classList.add('selected');
            });
        });

        // Handle Apply To Page button
        applyToPageBtn.addEventListener('click', () => {
            if (this.selectedSize) {
                this.setPageSize(this.selectedSize);
                this.modal.style.display = 'none';
                
                // Reset selection state
                this.selectedSize = null;
                applyToPageBtn.disabled = true;
                document.querySelectorAll('.size-options button').forEach(btn => {
                    btn.classList.remove('selected');
                });
            }
        });

        // Update Apply Custom Size handler
        document.getElementById('applyCustomSize').addEventListener('click', () => {
            const width = parseInt(customWidthInput.value);
            const height = parseInt(customHeightInput.value);
            
            // Validate custom size immediately
            if (!validateSize(width, height)) {
                alert('Selected size is too large for A4 page');
                return;
            }
            
            if (this.validateInput(customWidthInput, 1, 210, document.getElementById('widthValidation')) && 
                this.validateInput(customHeightInput, 1, 297, document.getElementById('heightValidation'))) {
                this.selectedSize = `${width}x${height}`;
                applyToPageBtn.disabled = false;
            }
        });

        // Handle custom size validation
        customWidthInput.addEventListener('input', (e) => {
            // Allow only numbers and backspace
            let value = e.target.value.replace(/[^\d]/g, '');
            if (value !== e.target.value) {
                e.target.value = value;
            }
            this.validateInput(e.target, 1, 210, document.getElementById('widthValidation'));
        });

        customHeightInput.addEventListener('input', (e) => {
            // Allow only numbers and backspace
            let value = e.target.value.replace(/[^\d]/g, '');
            if (value !== e.target.value) {
                e.target.value = value;
            }
            this.validateInput(e.target, 1, 297, document.getElementById('heightValidation'));
        });

        // Update custom size checkbox handler
        customSizeCheckbox.addEventListener('change', (e) => {
            customSizeSection.classList.toggle('enabled', e.target.checked);
            customWidthInput.disabled = !e.target.checked;
            customHeightInput.disabled = !e.target.checked;
            
            if (e.target.checked) {
                // Clear input values when enabling
                customWidthInput.value = '';
                customHeightInput.value = '';
                // Validate both inputs immediately when enabling
                this.validateInput(customWidthInput, 1, 210, document.getElementById('widthValidation'));
                this.validateInput(customHeightInput, 1, 297, document.getElementById('heightValidation'));
                // Clear any preset selection
                document.querySelectorAll('.size-options button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                this.selectedSize = null;
                applyToPageBtn.disabled = true;
            } else {
                // Disable the button when unchecking
                applyCustomSizeBtn.disabled = true;
                this.selectedSize = null;
                applyToPageBtn.disabled = true;
            }
        });

        // Setup drag and drop
        this.setupDragAndDrop();

        // Add other event listeners
        document.getElementById('saveLayout').addEventListener('click', () => this.saveLayout());
        document.getElementById('loadLayout').addEventListener('click', () => this.loadLayout());
        document.getElementById('exportPDF').addEventListener('click', () => this.exportToPDF());
        document.getElementById('printPreview').addEventListener('click', () => this.showPrintPreview());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('redo').addEventListener('click', () => this.redo());
    }

    validateInput(input, min, max, validationMsg) {
        // Allow empty or partial input
        if (input.value === '' || input.value === '-') {
            input.classList.add('invalid');
            validationMsg.classList.add('show');
            document.getElementById('applyCustomSize').disabled = true;
            return false;
        }

        const value = parseInt(input.value);
        const isValid = !isNaN(value) && value >= min && value <= max;
        
        input.classList.toggle('invalid', !isValid);
        validationMsg.classList.toggle('show', !isValid);
        
        // Check both inputs for validity
        const widthInput = document.getElementById('customWidth');
        const heightInput = document.getElementById('customHeight');
        
        // Check if both inputs have valid values
        const widthValue = parseInt(widthInput.value);
        const heightValue = parseInt(heightInput.value);
        
        const widthValid = !isNaN(widthValue) && widthValue >= 1 && widthValue <= 210;
        const heightValid = !isNaN(heightValue) && heightValue >= 1 && heightValue <= 297;
        
        // Enable button only if BOTH inputs are valid
        document.getElementById('applyCustomSize').disabled = !(widthValid && heightValid);
        
        return isValid;
    }

    setPageSize(size) {
        // Parse size string to get dimensions
        let [width, height] = size.split('x').map(n => parseInt(n));
        
        // Calculate layout
        const PAGE_WIDTH = 210;
        const PAGE_HEIGHT = 297;
        const MARGIN = 5;
        const SPACING = 10;
        
        // Get or create page
        const pageNumber = this.sessionManager.sessionData.currentPage;
        let page = this.sessionManager.getPage(pageNumber + 1);
        
        if (!page) {
            page = this.sessionManager.createPage(pageNumber + 1, size);
        } else {
            // Store the old size for comparison
            const oldSize = page.pageSize;
            page.pageSize = size;
            
            // If this is a size change and there are existing cards with images
            if (oldSize && oldSize !== size && page.cards.some(card => card.image)) {
                const proceed = confirm('Changing the size will remove all existing photos. Do you want to continue?');
                if (!proceed) {
                    page.pageSize = oldSize;
                    this.modal.style.display = 'none';
                    return false;
                }
            }
            page.cards = []; // Clear existing cards
        }

        // Clear existing placeholders
        this.pageContainer.innerHTML = '';

        // Add delete button to page
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'page-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deletePage(pageNumber + 1);
        };
        this.pageContainer.appendChild(deleteBtn);
        
        // Calculate grid layout
        const availableWidth = PAGE_WIDTH - (2 * MARGIN);
        const availableHeight = PAGE_HEIGHT - (2 * MARGIN);
        const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
        const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));
        
        // Create placeholders
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = MARGIN + (col * (width + SPACING));
                const y = MARGIN + (row * (height + SPACING));
                
                // Add card to session state
                const cardData = {
                    position: { x, y },
                    width: width,
                    height: height
                };
                const card = this.sessionManager.addCard(page.pageNumber, cardData);
                
                // Create DOM element
                const placeholder = document.createElement('div');
                placeholder.className = 'photo-placeholder';
                placeholder.id = card.id;
                
                Object.assign(placeholder.style, {
                    width: `${width}mm`,
                    height: `${height}mm`,
                    left: `${x}mm`,
                    top: `${y}mm`,
                    position: 'absolute'
                });
                
                this.pageContainer.appendChild(placeholder);
                this.setupDropZone(placeholder, card.id);
            }
        }
        
        // Close the modal
        this.modal.style.display = 'none';
        return true;
    }

    deletePage(pageNumber) {
        if (this.sessionManager.sessionData.pages.length <= 1) {
            alert('Cannot delete the last page. At least one page must remain.');
            return;
        }

        const confirmed = confirm('Are you sure you want to delete this page?');
        if (confirmed) {
            // Remove the page from session data
            this.sessionManager.sessionData.pages = this.sessionManager.sessionData.pages.filter(
                page => page.pageNumber !== pageNumber
            );

            // Renumber remaining pages
            this.sessionManager.sessionData.pages.forEach((page, index) => {
                page.pageNumber = index + 1;
            });

            // Update current page if necessary
            if (this.sessionManager.sessionData.currentPage >= this.sessionManager.sessionData.pages.length) {
                this.sessionManager.sessionData.currentPage = this.sessionManager.sessionData.pages.length - 1;
            }

            // Save state
            this.sessionManager.saveState('Delete Page');

            // Update the view
            this.updatePageIndicator();
            this.navigatePage(0); // Refresh current page view
        }
    }

    handleImageDrop(e, placeholder, cardId) {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const imageData = {
                    src: event.target.result,
                    originalWidth: img.width,
                    originalHeight: img.height
                };
                
                // Update session state with the new image
                const pageNumber = this.sessionManager.sessionData.currentPage + 1;
                this.sessionManager.setCardImage(pageNumber, cardId, imageData);
                
                // Create container and setup image
                const container = document.createElement('div');
                container.className = 'image-container';
                
                const imgElement = document.createElement('img');
                imgElement.src = imageData.src;
                
                // Get card dimensions from session state
                const card = this.sessionManager.getCard(pageNumber, cardId);
                
                // Set initial image styles for proper fitting
                const containerAspect = card.size.width / card.size.height;
                const imageAspect = imageData.originalWidth / imageData.originalHeight;
                
                if (containerAspect > imageAspect) {
                    imgElement.style.width = '100%';
                    imgElement.style.height = 'auto';
                } else {
                    imgElement.style.width = 'auto';
                    imgElement.style.height = '100%';
                }
                
                // Position image initially at center
                imgElement.style.position = 'absolute';
                imgElement.style.left = '50%';
                imgElement.style.top = '50%';
                imgElement.style.transform = 'translate(-50%, -50%)';
                
                container.appendChild(imgElement);
                
                // Clear placeholder and add container
                placeholder.innerHTML = '';
                placeholder.appendChild(container);
                
                // Add edit overlay
                this.addEditOverlay(placeholder, cardId);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    updateCardDisplay(placeholder, imageData) {
        placeholder.innerHTML = '';
        const img = document.createElement('img');
        img.src = imageData.src;
        placeholder.appendChild(img);
        this.addEditOverlay(placeholder);
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

    showSizeModal(isEdit = false) {
        this.modal.style.display = 'block';
        
        // Update the Apply To Page button text based on context
        const applyToPageBtn = document.getElementById('applyToPage');
        applyToPageBtn.textContent = isEdit ? 'Update Size' : 'Apply To Page';
        
        // Clear any previous selections
        document.querySelectorAll('.size-options button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Reset custom size inputs
        document.getElementById('enableCustomSize').checked = false;
        document.getElementById('customWidth').disabled = true;
        document.getElementById('customHeight').disabled = true;
        document.getElementById('applyCustomSize').disabled = true;
        document.getElementById('customSizeSection').classList.remove('enabled');
    }

    addNewPage() {
        // Create a new page in the session manager
        const newPageNumber = this.sessionManager.sessionData.pages.length + 1;
        this.sessionManager.sessionData.pages.push({
            pageNumber: newPageNumber,
            pageSize: null,
            cards: []
        });
        
        // Update current page to the new page
        this.sessionManager.sessionData.currentPage = newPageNumber - 1;
        
        // Update the page indicator
        this.updatePageIndicator();
        
        // Show the size modal for the new page
        this.showSizeModal();
    }

    navigatePage(direction) {
        const newPage = this.sessionManager.sessionData.currentPage + direction;
        if (newPage >= 0 && newPage < this.sessionManager.sessionData.pages.length) {
            this.sessionManager.sessionData.currentPage = newPage;
            this.updatePageIndicator();
            
            // Get the current page data
            const currentPage = this.sessionManager.getPage(newPage + 1);
            if (currentPage && currentPage.pageSize) {
                // Clear the current page container
                this.pageContainer.innerHTML = '';

                // Add delete button to page
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'page-delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.deletePage(newPage + 1);
                };
                this.pageContainer.appendChild(deleteBtn);
                
                // Recreate the layout with the page's size
                const [width, height] = currentPage.pageSize.split('x').map(n => parseInt(n));
                const PAGE_WIDTH = 210;
                const PAGE_HEIGHT = 297;
                const MARGIN = 5;
                const SPACING = 10;
                
                const availableWidth = PAGE_WIDTH - (2 * MARGIN);
                const availableHeight = PAGE_HEIGHT - (2 * MARGIN);
                
                const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
                const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));
                
                // Recreate each card and restore its image if it exists
                currentPage.cards.forEach(card => {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'photo-placeholder';
                    placeholder.id = card.id;
                    
                    Object.assign(placeholder.style, {
                        width: `${card.size.width}mm`,
                        height: `${card.size.height}mm`,
                        left: `${card.position.x}mm`,
                        top: `${card.position.y}mm`,
                        position: 'absolute'
                    });
                    
                    this.pageContainer.appendChild(placeholder);
                    this.setupDropZone(placeholder, card.id);
                    
                    // Restore image if it exists
                    if (card.image) {
                        const container = document.createElement('div');
                        container.className = 'image-container';
                        
                        const img = document.createElement('img');
                        img.src = card.image.src;
                        
                        // Set initial image styles for proper fitting
                        const containerAspect = card.size.width / card.size.height;
                        const imageAspect = card.image.originalWidth / card.image.originalHeight;
                        
                        if (containerAspect > imageAspect) {
                            img.style.width = 'auto';
                            img.style.height = '100%';
                        } else {
                            img.style.width = '100%';
                            img.style.height = 'auto';
                        }
                        
                        // Position image initially at center
                        img.style.position = 'absolute';
                        img.style.left = '50%';
                        img.style.top = '50%';
                        
                        // Apply stored image settings
                        if (card.imageSettings) {
                            const transform = [];
                            transform.push('translate(-50%, -50%)'); // Center the image
                            
                            if (card.imageSettings.translateX || card.imageSettings.translateY) {
                                transform.push(`translate(${card.imageSettings.translateX}px, ${card.imageSettings.translateY}px)`);
                            }
                            
                            if (card.imageSettings.rotation) {
                                transform.push(`rotate(${card.imageSettings.rotation}deg)`);
                            }
                            
                            if (card.imageSettings.zoom) {
                                transform.push(`scale(${card.imageSettings.zoom / 100})`);
                            }
                            
                            img.style.transform = transform.join(' ');
                        } else {
                            img.style.transform = 'translate(-50%, -50%)';
                        }
                        
                        container.appendChild(img);
                        placeholder.appendChild(container);
                        
                        // Add edit and delete buttons overlay
                        this.addEditOverlay(placeholder, card.id);
                    }
                });
            }
        }
    }

    updatePageIndicator() {
        this.pageIndicator.textContent = `Page ${this.sessionManager.sessionData.currentPage + 1} of ${this.sessionManager.sessionData.pages.length}`;
    }

    executeCommand(command) {
        command.execute();
        this.commandHistory.splice(this.commandIndex + 1);
        this.commandHistory.push(command);
        this.commandIndex++;
    }

    undo() {
        if (this.sessionManager.undo()) {
            // Refresh the current page view
            this.navigatePage(0);
            this.updatePageIndicator();
        }
    }

    redo() {
        if (this.sessionManager.redo()) {
            // Refresh the current page view
            this.navigatePage(0);
            this.updatePageIndicator();
        }
    }

    async saveLayout() {
        const layoutData = {
            pages: this.sessionManager.sessionData.pages,
            currentPage: this.sessionManager.sessionData.currentPage
        };
        
        const result = await window.electron.invoke('save-layout', layoutData);
        if (result) {
            alert('Layout saved successfully!');
        }
    }

    async loadLayout() {
        const layoutData = await window.electron.invoke('load-layout');
        if (layoutData) {
            // Load the session state
            this.sessionManager.loadSessionState(layoutData);
            
            // Update the page indicator
            this.updatePageIndicator();
            
            // Get current page data
            const currentPage = this.sessionManager.getPage(this.sessionManager.sessionData.currentPage + 1);
            if (currentPage && currentPage.pageSize) {
                // Clear the current page container
                this.pageContainer.innerHTML = '';
                
                // Recreate the layout with the page's size
                const [width, height] = currentPage.pageSize.split('x').map(n => parseInt(n));
                const PAGE_WIDTH = 210;
                const PAGE_HEIGHT = 297;
                const MARGIN = 5;
                const SPACING = 10;
                
                const availableWidth = PAGE_WIDTH - (2 * MARGIN);
                const availableHeight = PAGE_HEIGHT - (2 * MARGIN);
                
                const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
                const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));
                
                // Recreate each card and restore its image if it exists
                currentPage.cards.forEach(card => {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'photo-placeholder';
                    placeholder.id = card.id;
                    
                    Object.assign(placeholder.style, {
                        width: `${card.size.width}mm`,
                        height: `${card.size.height}mm`,
                        left: `${card.position.x}mm`,
                        top: `${card.position.y}mm`,
                        position: 'absolute'
                    });
                    
                    this.pageContainer.appendChild(placeholder);
                    this.setupDropZone(placeholder, card.id);
                    
                    // Restore image if it exists
                    if (card.image) {
                        const container = document.createElement('div');
                        container.className = 'image-container';
                        
                        const img = document.createElement('img');
                        img.src = card.image.src;
                        
                        // Set initial image styles for proper fitting
                        const containerAspect = card.size.width / card.size.height;
                        const imageAspect = card.image.originalWidth / card.image.originalHeight;
                        
                        if (containerAspect > imageAspect) {
                            img.style.width = '100%';
                            img.style.height = 'auto';
                        } else {
                            img.style.width = 'auto';
                            img.style.height = '100%';
                        }
                        
                        // Position image initially at center
                        img.style.position = 'absolute';
                        img.style.left = '50%';
                        img.style.top = '50%';
                        
                        // Apply stored image settings
                        if (card.imageSettings) {
                            const transform = [];
                            transform.push('translate(-50%, -50%)'); // Center the image
                            
                            if (card.imageSettings.translateX || card.imageSettings.translateY) {
                                transform.push(`translate(${card.imageSettings.translateX}px, ${card.imageSettings.translateY}px)`);
                            }
                            
                            if (card.imageSettings.rotation) {
                                transform.push(`rotate(${card.imageSettings.rotation}deg)`);
                            }
                            
                            if (card.imageSettings.zoom) {
                                transform.push(`scale(${card.imageSettings.zoom / 100})`);
                            }
                            
                            img.style.transform = transform.join(' ');
                        } else {
                            img.style.transform = 'translate(-50%, -50%)';
                        }
                        
                        container.appendChild(img);
                        placeholder.appendChild(container);
                        
                        // Add edit and delete buttons overlay
                        this.addEditOverlay(placeholder, card.id);
                    }
                });
            }
        }
    }

    async exportToPDF() {
        try {
            // Store current page to restore it later
            const currentPageIndex = this.sessionManager.sessionData.currentPage;
            
            // Create PDF with A4 dimensions (210mm x 297mm)
            const pdf = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Process each page
            for (let i = 0; i < this.sessionManager.sessionData.pages.length; i++) {
                // Navigate to the page to render it
                this.sessionManager.sessionData.currentPage = i;
                this.navigatePage(0); // Force render the current page
                
                // Wait a moment for images to load
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Hide empty placeholders before capture
                const emptyPlaceholders = document.querySelectorAll('.photo-placeholder:not(:has(img))');
                emptyPlaceholders.forEach(placeholder => {
                    placeholder.style.display = 'none';
                });
                
                // Remove dotted borders for capture
                const placeholders = document.querySelectorAll('.photo-placeholder');
                placeholders.forEach(placeholder => {
                    placeholder.style.border = 'none';
                    placeholder.style.backgroundColor = 'transparent';
                });
                
                // Hide edit overlays for capture
                const editOverlays = document.querySelectorAll('.edit-overlay');
                editOverlays.forEach(overlay => {
                    overlay.style.display = 'none';
                });

                // Ensure images maintain their transforms
                const images = document.querySelectorAll('.photo-placeholder img');
                images.forEach(img => {
                    const container = img.closest('.image-container');
                    if (container) {
                        // Get the card data from session state
                        const placeholder = container.closest('.photo-placeholder');
                        const cardId = placeholder.id;
                        const card = this.sessionManager.getCard(i + 1, cardId);
                        
                        if (card && card.imageSettings) {
                            // Apply the stored settings
                            const transform = [];
                            transform.push('translate(-50%, -50%)'); // Center the image
                            
                            if (card.imageSettings.translateX || card.imageSettings.translateY) {
                                transform.push(`translate(${card.imageSettings.translateX}px, ${card.imageSettings.translateY}px)`);
                            }
                            
                            if (card.imageSettings.rotation) {
                                transform.push(`rotate(${card.imageSettings.rotation}deg)`);
                            }
                            
                            if (card.imageSettings.zoom) {
                                transform.push(`scale(${card.imageSettings.zoom / 100})`);
                            }
                            
                            img.style.transform = transform.join(' ');
                            img.style.position = 'absolute';
                            img.style.left = '50%';
                            img.style.top = '50%';
                            
                            // Set size based on aspect ratio
                            const containerAspect = card.size.width / card.size.height;
                            const imageAspect = card.image.originalWidth / card.image.originalHeight;
                            
                            if (containerAspect > imageAspect) {
                                img.style.width = 'auto';
                                img.style.height = '100%';
                            } else {
                                img.style.width = '100%';
                                img.style.height = 'auto';
                            }
                        }
                    }
                });
                
                // Capture the page
                const pageElement = document.getElementById('a4Page');
                const canvas = await html2canvas(pageElement, {
                    scale: 4, // Higher resolution
                    useCORS: true, // Enable cross-origin image loading
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    width: pageElement.offsetWidth,
                    height: pageElement.offsetHeight,
                    logging: false, // Disable logging
                    onclone: (clonedDoc) => {
                        // Apply transforms to cloned images
                        const clonedImages = clonedDoc.querySelectorAll('.photo-placeholder img');
                        clonedImages.forEach(img => {
                            const originalImg = document.querySelector(`img[src="${img.src}"]`);
                            if (originalImg) {
                                img.style.transform = originalImg.style.transform;
                                img.style.width = originalImg.style.width;
                                img.style.height = originalImg.style.height;
                                img.style.position = originalImg.style.position;
                                img.style.left = originalImg.style.left;
                                img.style.top = originalImg.style.top;
                            }
                        });
                    }
                });
                
                // Convert to image and add to PDF
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                
                // Add new page if not first page
                if (i > 0) {
                    pdf.addPage();
                }
                
                // Add image to page (full A4 size)
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
                
                // Restore visibility of elements
                emptyPlaceholders.forEach(placeholder => {
                    placeholder.style.display = 'block';
                });
                placeholders.forEach(placeholder => {
                    placeholder.style.border = '2px dashed #dee2e6';
                    placeholder.style.backgroundColor = '#f8f9fa';
                });
                editOverlays.forEach(overlay => {
                    overlay.style.display = 'block';
                });
            }
            
            // Restore original page
            this.sessionManager.sessionData.currentPage = currentPageIndex;
            this.navigatePage(0);
            
            // Save the PDF
            const result = await window.electron.invoke('save-pdf', {
                data: pdf.output('arraybuffer'),
                defaultPath: 'photo-layout.pdf'
            });
            
            if (result) {
                alert('PDF exported successfully!');
            }
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Error exporting PDF. Please try again.');
        }
    }

    showPrintPreview() {
        if (!this.printManager) {
            this.printManager = new PrintManager();
        }
        
        this.printManager.showPrintDialog(this.pageContainer)
            .then(success => {
                if (success) {
                    console.log('Print completed successfully');
                } else {
                    console.log('Print cancelled or failed');
                }
            });
    }

    // Enhanced image handling with editing features
    setupImageEditor(container) {
        const editorModal = document.getElementById('imageEditorModal');
        const preview = document.getElementById('imageEditorPreview');
        const img = container.querySelector('img');
        const placeholder = container.closest('.photo-placeholder');
        const cardId = placeholder.id;
        const pageNumber = this.sessionManager.sessionData.currentPage + 1;

        // Get current settings from session state
        const card = this.sessionManager.getCard(pageNumber, cardId);
        const editState = {
            zoom: card.imageSettings?.zoom || 100,
            rotation: card.imageSettings?.rotation || 0,
            translateX: card.imageSettings?.translateX || 0,
            translateY: card.imageSettings?.translateY || 0,
            width: card.size.width,
            height: card.size.height
        };
        
        const previewWidth = card.size.width;
        const previewHeight = card.size.height;
        const history = [];
        let historyIndex = -1;
        
        preview.innerHTML = '';
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-container';
        previewContainer.style.width = `${previewWidth}mm`;
        previewContainer.style.height = `${previewHeight}mm`;
        
        const imgClone = img.cloneNode(true);
        
        // Set initial image styles for proper fitting
        const containerAspect = card.size.width / card.size.height;
        const imageAspect = card.image.originalWidth / card.image.originalHeight;
        
        if (containerAspect > imageAspect) {
            imgClone.style.width = 'auto';
            imgClone.style.height = '100%';
        } else {
            imgClone.style.width = '100%';
            imgClone.style.height = 'auto';
        }
        
        // Position image initially at center
        imgClone.style.position = 'absolute';
        imgClone.style.left = '50%';
        imgClone.style.top = '50%';
        
        previewContainer.appendChild(imgClone);
        preview.appendChild(previewContainer);
        preview.style.width = `${previewWidth}mm`;
        preview.style.height = `${previewHeight}mm`;

        // Initialize preview with current settings
        const updatePreview = () => {
            console.log('\nCurrent Preview State:');
            console.log('Applied dimensions:', {
                scale: editState.zoom / 100,
                transformedWidth: imgClone.offsetWidth * (editState.zoom / 100),
                transformedHeight: imgClone.offsetHeight * (editState.zoom / 100),
                currentTransform: imgClone.style.transform
            });

            const transform = [];
            transform.push('translate(-50%, -50%)'); // Center the image
            
            if (editState.translateX || editState.translateY) {
                transform.push(`translate(${editState.translateX}px, ${editState.translateY}px)`);
            }
            
            if (editState.rotation) {
                transform.push(`rotate(${editState.rotation}deg)`);
            }
            
            if (editState.zoom) {
                transform.push(`scale(${editState.zoom / 100})`);
            }
            
            imgClone.style.transform = transform.join(' ');
        };
        
        const saveState = () => {
            history.splice(historyIndex + 1);
            history.push({ ...editState });
            historyIndex++;
            
            // Save to session state
            this.sessionManager.updateCardImageSettings(pageNumber, cardId, { ...editState });
        };
        
        // Initialize controls with current values
        const zoomInput = document.getElementById('imageZoom');
        const rotationInput = document.getElementById('imageRotation');
        zoomInput.value = editState.zoom;
        rotationInput.value = editState.rotation;
        
        // Zoom control
        zoomInput.oninput = (e) => {
            editState.zoom = parseInt(e.target.value);
            updatePreview();
        };
        
        // Rotation control
        rotationInput.oninput = (e) => {
            editState.rotation = parseInt(e.target.value);
            updatePreview();
        };
        
        document.getElementById('rotateLeft').onclick = () => {
            editState.rotation = (editState.rotation - 90 + 360) % 360;
            rotationInput.value = editState.rotation;
            updatePreview();
            saveState();
        };
        
        document.getElementById('rotateRight').onclick = () => {
            editState.rotation = (editState.rotation + 90) % 360;
            rotationInput.value = editState.rotation;
            updatePreview();
            saveState();
        };
        
        document.getElementById('fitImage').onclick = () => {
            // Reset to original size
            editState.zoom = 100;
            editState.translateX = 0;
            editState.translateY = 0;
            zoomInput.value = editState.zoom;
            
            // Update preview and save
            updatePreview();
            saveState();
        };
        
        document.getElementById('fillImage').onclick = () => {
            // Force image to fill card dimensions
            imgClone.style.width = '100%';
            imgClone.style.height = '100%';
            imgClone.style.objectFit = 'fill';  // This will stretch the image
            
            // Reset transformations
            editState.zoom = 100;
            editState.translateX = 0;
            editState.translateY = 0;
            zoomInput.value = editState.zoom;

            console.log('Fill Image:', {
                cardWidth: card.size.width,
                cardHeight: card.size.height,
                imageStyle: {
                    width: imgClone.style.width,
                    height: imgClone.style.height,
                    objectFit: imgClone.style.objectFit
                }
            });
            
            // Update preview and save
            updatePreview();
            saveState();
        };
        
        document.getElementById('undoEdit').onclick = () => {
            if (historyIndex > 0) {
                historyIndex--;
                Object.assign(editState, history[historyIndex]);
                zoomInput.value = editState.zoom;
                rotationInput.value = editState.rotation;
                updatePreview();
                // Update session state
                this.sessionManager.updateCardImageSettings(pageNumber, cardId, { ...editState });
            }
        };
        
        document.getElementById('redoEdit').onclick = () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                Object.assign(editState, history[historyIndex]);
                zoomInput.value = editState.zoom;
                rotationInput.value = editState.rotation;
                updatePreview();
                // Update session state
                this.sessionManager.updateCardImageSettings(pageNumber, cardId, { ...editState });
            }
        };
        
        document.getElementById('applyChanges').onclick = () => {
            // Get the original image container in the card
            const cardImageContainer = container.querySelector('.image-container');
            const cardImage = container.querySelector('img');
            
            // Transfer all styles from preview to card image
            cardImage.style.width = imgClone.style.width;
            cardImage.style.height = imgClone.style.height;
            cardImage.style.objectFit = imgClone.style.objectFit;
            cardImage.style.position = 'absolute';
            cardImage.style.left = '50%';
            cardImage.style.top = '50%';
            
            // Apply the same transform
            const transform = [];
            transform.push('translate(-50%, -50%)');
            
            if (editState.translateX || editState.translateY) {
                transform.push(`translate(${editState.translateX}px, ${editState.translateY}px)`);
            }
            
            if (editState.rotation) {
                transform.push(`rotate(${editState.rotation}deg)`);
            }
            
            if (editState.zoom) {
                transform.push(`scale(${editState.zoom / 100})`);
            }
            
            cardImage.style.transform = transform.join(' ');
            
            // Save final state to session including image styles
            this.sessionManager.updateCardImageSettings(pageNumber, cardId, { 
                ...editState,
                imageWidth: imgClone.style.width,
                imageHeight: imgClone.style.height,
                objectFit: imgClone.style.objectFit
            });
            
            // Close the editor
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
                updatePreview();
            }
        };
        
        document.onmouseup = () => {
            if (isDragging) {
                isDragging = false;
                saveState();
            }
        };
        
        // Initialize preview with current settings
        updatePreview();
        saveState(); // Save initial state
        editorModal.style.display = 'block';
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            // Alternative approach
            this.modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    }

    createPhotoPlaceholders(size) {
        // Clear existing placeholders
        this.pageContainer.innerHTML = '';
        
        let [width, height] = size.split('x').map(n => parseInt(n));
        
        // Define page dimensions and spacing
        const PAGE_WIDTH = 210;  // A4 width in mm
        const PAGE_HEIGHT = 297; // A4 height in mm
        const MARGIN = 5;        // 5mm margin on all sides
        const SPACING = 10;      // 10mm spacing between cards
        
        // Calculate how many cards can fit
        const availableWidth = PAGE_WIDTH - (2 * MARGIN);
        const availableHeight = PAGE_HEIGHT - (2 * MARGIN);
        
        const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
        const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));
        
        // Validate if cards fit on page
        if (cols <= 0 || rows <= 0) {
            alert('Selected size is too large for A4 page');
            return;
        }

        // Create grid of placeholders
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = MARGIN + (col * (width + SPACING));
                const y = MARGIN + (row * (height + SPACING));
                
                const placeholder = document.createElement('div');
                placeholder.className = 'photo-placeholder';
                
                Object.assign(placeholder.style, {
                    width: `${width}mm`,
                    height: `${height}mm`,
                    left: `${x}mm`,
                    top: `${y}mm`,
                    position: 'absolute'
                });
                
                this.pageContainer.appendChild(placeholder);
                this.setupDropZone(placeholder);
            }
        }
    }

    setupDropZone(placeholder, cardId) {
        let dragCounter = 0;

        placeholder.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter++;
            if (dragCounter === 1) {
                placeholder.classList.add('dragover');
            }
        });

        placeholder.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        placeholder.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter--;
            if (dragCounter === 0) {
                placeholder.classList.remove('dragover');
            }
        });

        placeholder.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter = 0;
            placeholder.classList.remove('dragover');

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageFile(file, placeholder, cardId);
            }
        });

        // Add click handler for file browsing
        placeholder.addEventListener('click', () => {
            // Only trigger file browse if placeholder is empty
            if (!placeholder.querySelector('img')) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.style.display = 'none';
                
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file && file.type.startsWith('image/')) {
                        this.handleImageFile(file, placeholder, cardId);
                    }
                    // Clean up the input element
                    document.body.removeChild(input);
                };
                
                document.body.appendChild(input);
                input.click();
            }
        });
    }

    handleImageFile(file, placeholder, cardId) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const imageData = {
                    src: event.target.result,
                    originalWidth: img.width,
                    originalHeight: img.height
                };
                
                // Update session state with the new image
                const pageNumber = this.sessionManager.sessionData.currentPage + 1;
                this.sessionManager.setCardImage(pageNumber, cardId, imageData);
                
                // Create container and setup image
                const container = document.createElement('div');
                container.className = 'image-container';
                
                const imgElement = document.createElement('img');
                imgElement.src = imageData.src;
                
                // Get card dimensions from session state
                const card = this.sessionManager.getCard(pageNumber, cardId);
                
                // Set initial image styles for proper fitting
                const containerAspect = card.size.width / card.size.height;
                const imageAspect = imageData.originalWidth / imageData.originalHeight;
                
                if (containerAspect > imageAspect) {
                    imgElement.style.width = '100%';
                    imgElement.style.height = 'auto';
                } else {
                    imgElement.style.width = 'auto';
                    imgElement.style.height = '100%';
                }
                
                // Position image initially at center
                imgElement.style.position = 'absolute';
                imgElement.style.left = '50%';
                imgElement.style.top = '50%';
                imgElement.style.transform = 'translate(-50%, -50%)';
                
                container.appendChild(imgElement);
                
                // Clear placeholder and add container
                placeholder.innerHTML = '';
                placeholder.appendChild(container);
                
                // Add edit overlay
                this.addEditOverlay(placeholder, cardId);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    addEditOverlay(placeholder, cardId) {
        const editOverlay = document.createElement('div');
        editOverlay.className = 'edit-overlay';
        
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.innerHTML = '×';
        deleteButton.onclick = (e) => {
            e.stopPropagation(); // Stop event from bubbling up
            this.deleteImage(placeholder, cardId);
        };
        
        // Create edit button
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.innerHTML = '✎';
        editButton.onclick = (e) => {
            e.stopPropagation(); // Stop event from bubbling up
            this.setupImageEditor(placeholder);
        };
        
        // Add buttons to overlay
        editOverlay.appendChild(editButton);
        editOverlay.appendChild(deleteButton);
        
        // Prevent clicks on the overlay from triggering the placeholder click
        editOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        placeholder.appendChild(editOverlay);
    }

    // Add method to handle image deletion
    deleteImage(placeholder, cardId) {
        const confirmed = confirm('Are you sure you want to delete this image?');
        if (confirmed) {
            // Get the current page number
            const pageNumber = this.sessionManager.sessionData.currentPage + 1;
            
            // Get the card
            const card = this.sessionManager.getCard(pageNumber, cardId);
            if (card) {
                // Clear the image data
                card.image = null;
                card.imageSettings = {
                    rotation: 0,
                    zoom: 100,
                    translateX: 0,
                    translateY: 0,
                    fit: 'contain'
                };
                
                // Save the state
                this.sessionManager.saveState('Delete Image');
                
                // Clear the placeholder
                placeholder.innerHTML = '';
                
                // Reinitialize the drop zone
                this.setupDropZone(placeholder, cardId);
            }
        }
    }

    setupEditOverlay(placeholder) {
        // Remove any existing overlay
        const existingOverlay = placeholder.querySelector('.edit-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Create edit overlay
        const editOverlay = document.createElement('div');
        editOverlay.className = 'edit-overlay';
        
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.onclick = () => this.deleteImage(placeholder);
        
        // Create edit button
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.onclick = () => this.editImage(placeholder);
        
        // Add buttons to overlay
        editOverlay.appendChild(editButton);
        editOverlay.appendChild(deleteButton);
        
        // Add overlay to placeholder
        placeholder.appendChild(editOverlay);
    }

    deleteImage(placeholder) {
        const imageContainer = placeholder.querySelector('.image-container');
        if (imageContainer) {
            imageContainer.remove();
        }
        
        const editOverlay = placeholder.querySelector('.edit-overlay');
        if (editOverlay) {
            editOverlay.remove();
        }

        // Update session state
        const cardId = placeholder.id;
        const pageNumber = this.sessionManager.sessionData.currentPage + 1;
        const card = this.sessionManager.getCard(pageNumber, cardId);
        if (card) {
            card.image = null;
            card.imageSettings = null;
            this.sessionManager.saveState('Delete Image');
        }
    }

    editImage(placeholder) {
        // Implement image editing functionality
        // This can be expanded later with rotation, zoom, etc.
        console.log('Edit image functionality to be implemented');
    }

    resetProject() {
        const confirmed = confirm('Are you sure you want to reset the project? This will delete all pages and cannot be undone.');
        if (confirmed) {
            // Reset session data
            this.sessionManager.sessionData = {
                pages: [],
                currentPage: 0
            };

            // Clear history
            this.sessionManager.history = [];
            this.sessionManager.currentHistoryIndex = -1;

            // Create initial page
            this.addNewPage();

            // Update UI
            this.updatePageIndicator();
            
            // Save state
            this.sessionManager.saveState('Reset Project');
        }
    }
}

// Initialize the editor when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new PhotoLayoutEditor();
}); 