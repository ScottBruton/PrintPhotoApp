class PrintManager {
    constructor() {
        this.printModal = document.getElementById('printPreviewModal');
        this.previewContent = document.getElementById('printPreviewContent');
        this.confirmButton = document.getElementById('confirmPrint');
        this.cancelButton = document.getElementById('cancelPrint');
    }

    preparePrintContent(pageContainer) {
        console.log('Preparing print content...');
        const pageClone = pageContainer.cloneNode(true);
        
        // Log initial state
        console.log('Initial clone:', {
            width: pageClone.offsetWidth,
            height: pageClone.offsetHeight,
            childNodes: pageClone.childNodes.length
        });
        
        // Clean up and preserve styles
        pageClone.querySelectorAll('.photo-placeholder').forEach(placeholder => {
            const img = placeholder.querySelector('img');
            if (img) {
                console.log('Processing image:', {
                    src: img.src,
                    naturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
                    currentSize: `${img.offsetWidth}x${img.offsetHeight}`,
                    transform: img.style.transform
                });
            }
        });

        return pageClone;
    }

    showPreview(pageContainer) {
        console.log('Showing print preview...');
        const pageClone = this.preparePrintContent(pageContainer);
        
        this.previewContent.innerHTML = '';
        this.previewContent.appendChild(pageClone);
        this.printModal.style.display = 'block';

        return new Promise((resolve) => {
            this.confirmButton.onclick = async () => {
                console.log('Print confirmed, preparing to print...');
                this.printModal.style.display = 'none';
                const success = await this.print(pageClone);
                resolve(success);
            };

            this.cancelButton.onclick = () => {
                console.log('Print cancelled');
                this.printModal.style.display = 'none';
                resolve(false);
            };
        });
    }

    async print(content) {
        try {
            console.log('Creating print HTML...');
            const printHTML = this.createPrintHTML(content);
            
            // Log the HTML structure (first 500 chars)
            console.log('Print HTML preview:', printHTML.substring(0, 500));
            console.log('HTML stats:', {
                totalLength: printHTML.length,
                imageCount: (printHTML.match(/<img/g) || []).length,
                placeholderCount: (printHTML.match(/photo-placeholder/g) || []).length
            });

            console.log('Sending print request to main process...');
            return await window.electron.print.preview(printHTML);
        } catch (error) {
            console.error('Print error:', error);
            return false;
        }
    }

    createPrintHTML(content) {
        const html = `
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
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                    }
                    .photo-placeholder img {
                        position: absolute;
                        transform-origin: center;
                        max-width: none;
                        max-height: none;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                </style>
            </head>
            <body>
                ${content.outerHTML}
                <script>
                    // Force immediate rendering
                    document.fonts.ready.then(() => {
                        document.body.style.visibility = 'visible';
                    });
                </script>
            </body>
            </html>
        `.trim();

        return html;
    }
}

// Export the PrintManager class
window.PrintManager = PrintManager; 