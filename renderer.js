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
                    fit: 'contain' // or 'cover'
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

    // Load session state (useful for undo/redo)
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
        
        let selectedSize = null;
        const applyToPageBtn = document.getElementById('applyToPage');

        // Handle custom size checkbox
        const customSizeCheckbox = document.getElementById('enableCustomSize');
        const customSizeSection = document.getElementById('customSizeSection');
        const customWidthInput = document.getElementById('customWidth');
        const customHeightInput = document.getElementById('customHeight');
        const applyCustomSizeBtn = document.getElementById('applyCustomSize');

        // Handle custom size validation
        const validateInput = (input, min, max, validationMsg) => {
            // Allow empty or partial input
            if (input.value === '' || input.value === '-') {
                input.classList.add('invalid');
                validationMsg.classList.add('show');
                applyCustomSizeBtn.disabled = true;
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
            applyCustomSizeBtn.disabled = !(widthValid && heightValid);
            
            return isValid;
        };

        // Update the event listeners with immediate validation
        customWidthInput.addEventListener('input', (e) => {
            validateInput(e.target, 1, 210, document.getElementById('widthValidation'));
        });

        customHeightInput.addEventListener('input', (e) => {
            validateInput(e.target, 1, 297, document.getElementById('heightValidation'));
        });

        // Update custom size checkbox handler
        customSizeCheckbox.addEventListener('change', (e) => {
            customSizeSection.classList.toggle('enabled', e.target.checked);
            customWidthInput.disabled = !e.target.checked;
            customHeightInput.disabled = !e.target.checked;
            
            if (e.target.checked) {
                // Validate both inputs immediately when enabling
                validateInput(customWidthInput, 1, 210, document.getElementById('widthValidation'));
                validateInput(customHeightInput, 1, 297, document.getElementById('heightValidation'));
            } else {
                // Disable the button when unchecking
                applyCustomSizeBtn.disabled = true;
            }
        });

        // Update Apply Custom Size handler
        document.getElementById('applyCustomSize').addEventListener('click', () => {
            const width = customWidthInput.value;
            const height = customHeightInput.value;
            
            if (validateInput(customWidthInput, 1, 210, widthValidation) && 
                validateInput(customHeightInput, 1, 297, heightValidation)) {
                selectedSize = `${width}x${height}`;
                document.getElementById('applyToPage').disabled = false;
            }
        });

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
                selectedSize = e.target.dataset.size;
                document.getElementById('applyToPage').disabled = false;
                
                // Highlight the selected button
                document.querySelectorAll('.size-options button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                e.target.classList.add('selected');
            });
        });

        // Handle Apply To Page button
        applyToPageBtn.addEventListener('click', () => {
            console.log("applyToPageBtn clicked");
            console.log(selectedSize);
            if (selectedSize != "") {
                this.createPhotoPlaceholders(selectedSize);
                this.modal.style.display = 'none';
                
                // Reset selection state
                selectedSize = null;
                applyToPageBtn.disabled = true;
                document.querySelectorAll('.size-options button').forEach(btn => {
                    btn.classList.remove('selected');
                });
            }
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
                
                // Update session state
                this.sessionManager.setCardImage(
                    this.sessionManager.sessionData.currentPage + 1,
                    cardId,
                    imageData
                );
                
                // Update DOM
                this.updateCardDisplay(placeholder, imageData);
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
        this.sessionManager.sessionData.pages.push({ pageNumber: this.sessionManager.sessionData.pages.length + 1, pageSize: null, cards: [] });
        this.sessionManager.sessionData.currentPage = this.sessionManager.sessionData.pages.length - 1;
        this.updatePageIndicator();
        this.showSizeModal();
    }

    navigatePage(direction) {
        const newPage = this.sessionManager.sessionData.currentPage + direction;
        if (newPage >= 0 && newPage < this.sessionManager.sessionData.pages.length) {
            this.sessionManager.sessionData.currentPage = newPage;
            this.updatePageIndicator();
            if (this.sessionManager.sessionData.pages[this.sessionManager.sessionData.currentPage].pageSize) {
                this.createPhotoPlaceholders(this.sessionManager.sessionData.pages[this.sessionManager.sessionData.currentPage].pageSize, this.sessionManager.sessionData.pages[this.sessionManager.sessionData.currentPage]);
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

    setupDropZone(placeholder) {
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
            
            const file = e.dataTransfer.files[0];
            if (!file || !file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                
                // Clear placeholder and add image
                placeholder.innerHTML = '';
                placeholder.appendChild(img);
                
                // Add edit overlay
                this.addEditOverlay(placeholder);
            };
            reader.readAsDataURL(file);
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