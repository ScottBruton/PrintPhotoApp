// SessionStateManager to handle all session data
class SessionStateManager {
    constructor() {
        this.sessionData = {
            pages: [],
            currentPage: 0
        };
    }

    // Initialize a new page
    createPage(pageNumber, pageSize) {
        const newPage = {
            pageNumber: pageNumber,
            pageSize: pageSize,
            cards: []
        };
        this.sessionData.pages.push(newPage);
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
            // Keep existing image settings if they exist, otherwise initialize them
            if (!card.imageSettings) {
                card.imageSettings = {
                    rotation: 0,
                    zoom: 100,
                    translateX: 0,
                    translateY: 0,
                    fit: 'contain'
                };
            }
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
        
        // Add edit size button event listener
        document.getElementById('editSize').addEventListener('click', () => this.showSizeModal(true));
        
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

        // Update preset size button handling
        document.querySelectorAll('.size-options button').forEach(button => {
            button.addEventListener('click', (e) => {
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
            const width = customWidthInput.value;
            const height = customHeightInput.value;
            
            if (this.validateInput(customWidthInput, 1, 210, document.getElementById('widthValidation')) && 
                this.validateInput(customHeightInput, 1, 297, document.getElementById('heightValidation'))) {
                this.selectedSize = `${width}x${height}`;
                applyToPageBtn.disabled = false;
            }
        });

        // Handle custom size validation
        customWidthInput.addEventListener('input', (e) => {
            this.validateInput(e.target, 1, 210, document.getElementById('widthValidation'));
        });

        customHeightInput.addEventListener('input', (e) => {
            this.validateInput(e.target, 1, 297, document.getElementById('heightValidation'));
        });

        // Update custom size checkbox handler
        customSizeCheckbox.addEventListener('change', (e) => {
            customSizeSection.classList.toggle('enabled', e.target.checked);
            customWidthInput.disabled = !e.target.checked;
            customHeightInput.disabled = !e.target.checked;
            
            if (e.target.checked) {
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
        
        const availableWidth = PAGE_WIDTH - (2 * MARGIN);
        const availableHeight = PAGE_HEIGHT - (2 * MARGIN);
        
        // Calculate number of cards that can fit
        const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
        const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));
        
        // Validate if cards fit on page
        if (cols <= 0 || rows <= 0) {
            alert('Selected size is too large for A4 page');
            return;
        }

        // Clear existing placeholders
        this.pageContainer.innerHTML = '';
        
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
                    return;
                }
            }
            page.cards = []; // Clear existing cards
        }
        
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
                const editOverlay = document.createElement('div');
                editOverlay.className = 'edit-overlay';
                const editButton = document.createElement('button');
                editButton.className = 'edit-btn';
                editButton.innerHTML = '✎';
                editButton.onclick = () => this.setupImageEditor(container);
                editOverlay.appendChild(editButton);
                placeholder.appendChild(editOverlay);
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
                        
                        // Restore edit overlay
                        const editOverlay = document.createElement('div');
                        editOverlay.className = 'edit-overlay';
                        const editButton = document.createElement('button');
                        editButton.className = 'edit-btn';
                        editButton.innerHTML = '✎';
                        editButton.onclick = () => this.setupImageEditor(container);
                        editOverlay.appendChild(editButton);
                        placeholder.appendChild(editOverlay);
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
            this.sessionManager.loadSessionState(layoutData);
            this.updatePageIndicator();
            this.createPhotoPlaceholders(this.sessionManager.sessionData.pages[this.sessionManager.sessionData.currentPage].pageSize, this.sessionManager.sessionData.pages[this.sessionManager.sessionData.currentPage]);
        }
    }

    async exportToPDF() {
        const pdf = new jsPDF();
        
        for (let i = 0; i < this.sessionManager.sessionData.pages.length; i++) {
            const pageElement = document.getElementById('a4Page');
            const canvas = await html2canvas(pageElement);
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        }
        
        pdf.save('photo-layout.pdf');
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
            zoom: card.imageSettings.zoom || 100,
            rotation: card.imageSettings.rotation || 0,
            translateX: card.imageSettings.translateX || 0,
            translateY: card.imageSettings.translateY || 0
        };
        
        const history = [];
        let historyIndex = -1;
        
        preview.innerHTML = '';
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-container';
        const imgClone = img.cloneNode(true);
        previewContainer.appendChild(imgClone);
        preview.appendChild(previewContainer);
        
        // Initialize preview with current settings
        const updatePreview = () => {
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
            editState.zoom = 100;
            zoomInput.value = 100;
            updatePreview();
            saveState();
        };
        
        document.getElementById('fillImage').onclick = () => {
            editState.zoom = 200;
            zoomInput.value = 200;
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
            // Apply final transform to original image
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
            
            img.style.transform = transform.join(' ');
            
            // Save final state to session
            this.sessionManager.updateCardImageSettings(pageNumber, cardId, { ...editState });
            
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
        placeholder.addEventListener('dragover', e => {
            e.preventDefault();
            placeholder.classList.add('dragover');
        });

        placeholder.addEventListener('dragleave', () => {
            placeholder.classList.remove('dragover');
        });

        placeholder.addEventListener('drop', e => {
            e.preventDefault();
            placeholder.classList.remove('dragover');
            this.handleImageDrop(e, placeholder, cardId);
        });
    }

    addEditOverlay(placeholder) {
        const editOverlay = document.createElement('div');
        editOverlay.className = 'edit-overlay';
        
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.innerHTML = '✎';
        editButton.onclick = () => this.setupImageEditor(placeholder);
        
        editOverlay.appendChild(editButton);
        placeholder.appendChild(editOverlay);
    }
}

// Initialize the editor when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new PhotoLayoutEditor();
}); 