class LayoutRenderer {
    constructor() {
        this.layoutState = {
            pages: [],
            currentPage: 0,
            settings: {
                pageWidth: 210, // A4 width in mm
                pageHeight: 297, // A4 height in mm
                margin: 5,
                spacing: 10
            }
        };
    }

    setLayoutState(sessionData) {
        // Deep clone the session data to avoid reference issues
        this.layoutState.pages = JSON.parse(JSON.stringify(sessionData.pages));
        this.layoutState.currentPage = sessionData.currentPage;
    }

    generateHTML() {
        let html = '';
        
        // Generate HTML for each page
        this.layoutState.pages.forEach((page, pageIndex) => {
            const pageHtml = this.generatePageHTML(page, pageIndex);
            html += pageHtml;
        });

        return html;
    }

    generatePageHTML(page, pageIndex) {
        const isCurrentPage = pageIndex === this.layoutState.currentPage;
        let pageHtml = `
            <div class="a4-page" data-page="${pageIndex + 1}" style="display: ${isCurrentPage ? 'block' : 'none'}">
        `;

        // Add delete button for page
        pageHtml += `
            <button class="page-delete-btn" onclick="window.rendererInstance.deletePage(${pageIndex + 1})">×</button>
        `;

        // Generate HTML for each card on the page
        page.cards.forEach(card => {
            pageHtml += this.generateCardHTML(card);
        });

        pageHtml += '</div>';
        return pageHtml;
    }

    generateCardHTML(card) {
        const { position, size, image, imageSettings } = card;
        let cardHtml = `
            <div class="photo-placeholder" id="${card.id}" 
                style="width: ${size.width}mm; height: ${size.height}mm; left: ${position.x}mm; top: ${position.y}mm; position: absolute;">
        `;

        if (image) {
            const containerAspect = size.width / size.height;
            const imageAspect = image.originalWidth / image.originalHeight;
            const imgStyle = containerAspect > imageAspect ? 
                'width: auto; height: 100%;' : 
                'width: 100%; height: auto;';

            // Generate transform style for image
            const transform = [];
            transform.push('translate(-50%, -50%)'); // Center the image
            
            if (imageSettings) {
                if (imageSettings.translateX || imageSettings.translateY) {
                    transform.push(`translate(${imageSettings.translateX}px, ${imageSettings.translateY}px)`);
                }
                if (imageSettings.rotation) {
                    transform.push(`rotate(${imageSettings.rotation}deg)`);
                }
                if (imageSettings.zoom) {
                    transform.push(`scale(${imageSettings.zoom / 100})`);
                }
            }

            cardHtml += `
                <div class="image-container">
                    <img src="${image.src}" 
                        style="${imgStyle} position: absolute; left: 50%; top: 50%; transform: ${transform.join(' ')};">
                </div>
                <div class="edit-overlay">
                    <button class="edit-btn" onclick="window.rendererInstance.setupImageEditor(this.closest('.photo-placeholder').querySelector('.image-container'))">
                        <img src="asset/edit.svg" alt="Edit">
                    </button>
                    <button class="delete-btn" onclick="window.rendererInstance.deleteImage(this.closest('.photo-placeholder'))">
                        <img src="asset/delete.svg" alt="Delete">
                    </button>
                </div>
            `;
        }

        cardHtml += '</div>';
        return cardHtml;
    }

    updateCard(cardId, pageNumber) {
        const page = this.layoutState.pages.find(p => p.pageNumber === pageNumber);
        if (!page) return null;

        const card = page.cards.find(c => c.id === cardId);
        if (!card) return null;

        return this.generateCardHTML(card);
    }
}

// Make it globally available
window.LayoutRenderer = LayoutRenderer;