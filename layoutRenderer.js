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

    async setLayoutState(sessionData) {
        // Deep clone the session data to avoid reference issues
        this.layoutState.pages = JSON.parse(JSON.stringify(sessionData.pages));
        this.layoutState.currentPage = sessionData.currentPage;

        // Generate complete HTML document
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Current Layout</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        body {
            margin: 0;
            padding: 0;
            background: #f0f0f0;
        }
        .a4-page {
            width: 210mm;
            height: 297mm;
            position: relative;
            page-break-after: always;
            margin: 0 auto;
            padding: 0;
            background: white;
            display: block !important;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .photo-placeholder {
            position: absolute;
            box-sizing: border-box;
            background: #fff;
            border: 1px solid #ddd;
        }
        .photo-placeholder .image-container {
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
        }
        .photo-placeholder img {
            position: absolute;
            left: 50%;
            top: 50%;
        }
        .edit-overlay, .page-delete-btn {
            display: none !important;
        }
        @media print {
            body {
                width: 210mm;
                height: 297mm;
                background: none;
            }
            .a4-page {
                box-shadow: none;
                margin: 0;
                padding: 0;
            }
            .photo-placeholder {
                border: none;
            }
        }
    </style>
</head>
<body>
    ${this.generateHTML()}
</body>
</html>`;

        // Save to temp file using electron API
        try {
            await window.electron.invoke('save-temp-html', html);
        } catch (error) {
            console.error('Error saving layout HTML:', error);
        }
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
            
            // Determine image dimensions based on fit setting
            let imgStyle = '';
            if (imageSettings.fit === 'fill') {
                imgStyle = 'width: 100%; height: 100%; object-fit: fill;';
            } else {
                imgStyle = containerAspect > imageAspect ? 
                    'width: auto; height: 100%; object-fit: contain;' : 
                    'width: 100%; height: auto; object-fit: contain;';
            }

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
                <div class="image-container" style="width: 100%; height: 100%; position: relative; overflow: hidden;">
                    <img src="${image.src}" 
                        style="${imgStyle} position: absolute; left: 50%; top: 50%; transform: ${transform.join(' ')};">
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

    generateEditorPreviewHTML(card) {
        const { image, imageSettings } = card;
        if (!image) return '';

        const containerAspect = card.size.width / card.size.height;
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

        return `
            <div class="image-container" style="width: 100%; height: 100%; position: relative; overflow: hidden;">
                <img src="${image.src}" 
                    style="${imgStyle} position: absolute; left: 50%; top: 50%; transform: ${transform.join(' ')};">
            </div>
        `;
    }
}

// Make it globally available
window.LayoutRenderer = LayoutRenderer;