class Session {
    constructor() {
        this.pages = [];
        this.currentPage = 0;
        this.history = [];
        this.historyLimit = 50;
    }

    saveToLocalStorage() {
        localStorage.setItem('sessionData', JSON.stringify(this));
    }
    
    static loadFromLocalStorage() {
        const data = JSON.parse(localStorage.getItem('sessionData'));
        return Object.assign(new Session(), data);
    }

    validatePageSize(width, height) {
        return width > 0 && height > 0 && width <= 210 && height <= 297; // Example A4 bounds
    }

    // Page management
    addPage(pageSize = null) {
        const pageNumber = this.pages.length + 1;
        const newPage = new Page(pageNumber, pageSize);
        this.pages.push(newPage);
        this.addToHistory('Add Page');
        return newPage;
    }

    getCurrentPage() {
        return this.pages[this.currentPage];
    }

    // History management
    addToHistory(action) {
        const state = JSON.parse(JSON.stringify(this)); // Deep copy
        this.history.push(new History(state, action));
        if (this.history.length > this.historyLimit) {
            this.history.shift();
        }
    }
}

class Page {
    constructor(pageNumber, pageSize = null) {
        this.pageNumber = pageNumber;
        this.pageSize = pageSize;
        this.margins = {
            top: 5,
            bottom: 5,
            left: 5,
            right: 5
        };
        this.spacing = 10;
        this.cards = [];
        this.pagePreview = new PagePreview();
        this.calculateAvailableSpace();
    }

    calculateAvailableSpace() {
        if (this.pageSize) {
            const [width, height] = this.pageSize.split('x').map(Number);
            this.availableWidth = width - (this.margins.left + this.margins.right);
            this.availableHeight = height - (this.margins.top + this.margins.bottom);
        } else {
            this.availableWidth = null;
            this.availableHeight = null;
        }
    }

    addCard(x, y, width, height) {
        const cardIndex = this.cards.length;
        const newCard = new Card(this.pageNumber, cardIndex, x, y, width, height);
        this.cards.push(newCard);
        this.addToHistory('Add Card');
        return newCard;
    }

    generatePreview() {
        // Simulate generating a preview (use a library like html2canvas for real implementation)
        this.pagePreview.update("data:image/png;base64,examplePreviewImage");
    }
}

class PagePreview {
    constructor() {
        this.previewImage = null;
        this.previewScale = 1.0;
        this.lastUpdated = null;
        this.isUpToDate = false;
    }

    update(previewImage) {
        this.previewImage = previewImage;
        this.lastUpdated = new Date();
        this.isUpToDate = true;
    }
}

class Card {
    constructor(pageNumber, index, x, y, width, height) {
        this.id = `card-${pageNumber}-${index}`;
        this.position = { x, y };
        this.size = { width, height };
        this.image = null;
        this.draggable = true;
    }

    setImage(src, originalWidth, originalHeight) {
        this.image = new CardImage(src, originalWidth, originalHeight);
    }
}

class CardImage {
    constructor(src, originalWidth, originalHeight) {
        this.src = src;
        this.originalWidth = originalWidth;
        this.originalHeight = originalHeight;
        this.imageSettings = new ImageSettings();
        this.imageHistory = [];
        this.maxHistorySize = 50;
    }

    addToHistory() {
        const historyEntry = {
            src: this.src,
            imageSettings: JSON.parse(JSON.stringify(this.imageSettings)),
            timestamp: new Date()
        };

        this.imageHistory.push(historyEntry);
        if (this.imageHistory.length > this.maxHistorySize) {
            this.imageHistory.shift();
        }
    }
}

class ImageSettings {
    constructor() {
        this.rotation = 0;
        this.zoom = 100;
        this.translateX = 0;
        this.translateY = 0;
        this.fit = 'contain';
        this.width = '100%';
        this.height = '100%';
        this.objectFit = this.fit;
        this.scale = this.zoom / 100;
        this.centerX = 0;
        this.centerY = 0;
        this.maintainAspectRatio = true;
        this.adjusted = {
            adjustedWidth: null,
            adjustedHeight: null,
            adjustedTranslateX: 0,
            adjustedTranslateY: 0,
            adjustedRotation: 0
        };
    }

    updateAdjusted(width, height, translateX, translateY, rotation) {
        this.adjusted = {
            adjustedWidth: width,
            adjustedHeight: height,
            adjustedTranslateX: translateX,
            adjustedTranslateY: translateY,
            adjustedRotation: rotation
        };
    }
}

class History {
    constructor(state, action) {
        this.state = state;
        this.action = action;
    }
}

// Export the Session class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Session;
} else {
    window.Session = Session;
}
