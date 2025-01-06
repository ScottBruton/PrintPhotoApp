class PrintManager {
  constructor() {
    this.dialog = null;
    this.printPreview = null;
    this.currentSettings = {
      printer: "",
      copies: 1,
      layout: "portrait",
      pages: "all",
      pageRanges: "",
      color: true,
    };
    this.printerList = [];
    this.toastContainer = null;

    this.setupToastContainer();
    this.printerStatusInterval = null;
    this.initializePrinterMonitoring();

    // Clean up interval when window is closed
    window.addEventListener("beforeunload", () => {
      if (this.printerStatusInterval) {
        clearInterval(this.printerStatusInterval);
      }
    });
  }

  initializePrinterMonitoring() {
    // Initial printer load
    this.refreshPrinters();
    // Update printer status every 30 seconds
    this.printerStatusInterval = setInterval(() => {
      this.updatePrinterStatuses();
    }, 30000);
  }

  async refreshPrinters() {
    try {
      // Get printers from Windows API
      const result = await window.electron.winPrint.getPrinters();
      if (result.success) {
        this.printerList = result.printers.map((printer) => ({
          ...printer,
          statusText: this.getPrinterStatusText(printer.status, printer.name),
        }));
        this.updatePrinterDropdown();
      } else {
        console.error("Failed to get printers:", result.error);
      }
    } catch (error) {
      console.error("Error refreshing printers:", error);
    }
  }

  getPrinterStatusText(status, printerName) {
    // List of known virtual printers
    const virtualPrinters = [
      "Microsoft Print to PDF",
      "Microsoft XPS Document Writer",
      "OneNote",
      "OneNote for Windows 10",
      "Fax",
      "Adobe PDF",
    ];

    // Check if this is a virtual printer
    if (virtualPrinters.some((vp) => printerName.includes(vp))) {
      return { text: "Virtual Printer", ready: true };
    }

    // Windows printer status codes for physical printers
    const statusCodes = {
      0: { text: "Ready", ready: true },
      1: { text: "Paused", ready: false },
      2: { text: "Error", ready: false },
      3: { text: "Pending Deletion", ready: false },
      4: { text: "Paper Jam", ready: false },
      5: { text: "Paper Out", ready: false },
      6: { text: "Manual Feed", ready: false },
      7: { text: "Paper Problem", ready: false },
      8: { text: "Offline", ready: false },
      9: { text: "IO Active", ready: true },
      10: { text: "Busy", ready: true },
      11: { text: "Printing", ready: true },
      12: { text: "Output Bin Full", ready: false },
      13: { text: "Not Available", ready: false },
      14: { text: "Waiting", ready: true },
      15: { text: "Processing", ready: true },
      16: { text: "Initializing", ready: false },
      17: { text: "Warming Up", ready: false },
      18: { text: "Toner Low", ready: true },
      19: { text: "No Toner", ready: false },
      20: { text: "Page Punt", ready: false },
      21: { text: "User Intervention", ready: false },
      22: { text: "Out of Memory", ready: false },
      23: { text: "Door Open", ready: false },
      24: { text: "Server Unknown", ready: false },
      25: { text: "Power Save", ready: true },
    };

    return statusCodes[status] || { text: "Unknown", ready: false };
  }

  updatePrinterDropdown() {
    const select = this.dialog.querySelector("#printerSelect");
    const searchTerm = this.dialog
      .querySelector("#printerSearch")
      .value.toLowerCase();

    // Filter printers based on search term
    const filteredPrinters = this.printerList.filter((printer) =>
      printer.name.toLowerCase().includes(searchTerm)
    );

    // Sort printers: Physical printers first, then virtual printers
    const sortedPrinters = filteredPrinters.sort((a, b) => {
      const aIsVirtual = a.statusText.text === "Virtual Printer";
      const bIsVirtual = b.statusText.text === "Virtual Printer";
      if (aIsVirtual && !bIsVirtual) return 1;
      if (!aIsVirtual && bIsVirtual) return -1;
      return a.name.localeCompare(b.name);
    });

    // Clear existing options
    select.innerHTML = "";

    // Add filtered printers to dropdown
    sortedPrinters.forEach((printer) => {
      const option = document.createElement("option");
      option.value = printer.name;

      // Create status indicator
      let statusDot;
      if (printer.statusText.text === "Virtual Printer") {
        statusDot = "🔵"; // Blue dot for virtual printers
      } else {
        statusDot = printer.statusText.ready ? "🟢" : "🔴";
      }

      option.innerHTML = `${statusDot} ${printer.name} - ${printer.statusText.text}`;
      select.appendChild(option);
    });
  }

  async validatePrintJob(settings) {
    const requiredFields = {
      printer: "Printer name is required",
      copies: "Number of copies is required",
      layout: "Page layout is required",
      quality: "Print quality is required",
      paperType: "Paper type is required",
    };

    const errors = [];

    // Check required fields
    for (const [field, message] of Object.entries(requiredFields)) {
      if (!settings[field]) {
        errors.push(message);
      }
    }

    // Validate specific fields
    if (settings.copies && (isNaN(settings.copies) || settings.copies < 1)) {
      errors.push("Number of copies must be at least 1");
    }

    if (
      settings.quality &&
      ![150, 300, 600].includes(Number(settings.quality))
    ) {
      errors.push("Invalid print quality setting");
    }

    if (settings.pages === "custom") {
      if (!settings.pageRanges) {
        errors.push("Page ranges are required when custom pages are selected");
      } else {
        // Validate page ranges format (e.g., "1-5, 8, 11-13")
        const rangePattern = /^(\d+(-\d+)?)(,\s*\d+(-\d+)?)*$/;
        if (!rangePattern.test(settings.pageRanges)) {
          errors.push("Invalid page range format");
        }
      }
    }

    // Check printer status
    const selectedPrinter = this.printerList.find(
      (p) => p.name === settings.printer
    );
    if (selectedPrinter && !selectedPrinter.statusText.ready) {
      errors.push(
        `Printer "${settings.printer}" is not ready: ${selectedPrinter.statusText.text}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async executePrint() {
    // Gather all settings
    const settings = {
      printer: this.dialog.querySelector("#printerSelect").value,
      copies: parseInt(this.dialog.querySelector("#copiesInput").value),
      layout: this.dialog.querySelector('input[name="layout"]:checked').value,
      pages: this.dialog.querySelector('input[name="pages"]:checked').value,
      pageRanges: this.dialog.querySelector(".page-ranges").value,
      quality: parseInt(this.dialog.querySelector("#printQuality").value),
      paperType: this.dialog.querySelector('input[name="paperType"]:checked')
        .value,
    };

    // Validate print job
    const validation = await this.validatePrintJob(settings);
    if (!validation.isValid) {
      alert("Print job validation failed:\n" + validation.errors.join("\n"));
      return;
    }

    // Close the print dialog before sending to print
    this.dialog.style.display = "none";

    try {
      // Create temporary file for printing
      const tempPath = await this.createTempFile(
        this.printPreview.previewContent.innerHTML
      );

      // Send to print using Windows printing
      const result = await window.electron.winPrint.printFile(
        tempPath,
        settings.printer
      );

      if (result.success) {
        this.showToast(`Successfully sent to printer: ${settings.printer}`);
        this.closeDialog(true);
      } else {
        throw new Error(result.error || "Print failed");
      }
    } catch (error) {
      console.error("Print error:", error);
      alert(`Print failed: ${error.message}`);
      this.closeDialog(false);
    }
  }

  async createTempFile(content) {
    // This method would create a temporary file with the content
    // Implementation depends on your application's requirements
    // You might want to create an HTML file, PDF, or other format
    // Return the path to the temporary file
    return tempPath;
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
    this.dialog.style.display = "flex";

    // Get the renderer instance
    const rendererInstance = window.rendererInstance;
    if (!rendererInstance || !rendererInstance.sessionManager) {
      console.error("Renderer instance not found");
      return;
    }

    // Get pages directly from session data
    const sessionPages = rendererInstance.sessionManager.sessionData.pages;
    console.log("Pages in session:", sessionPages.length);

    // Store current page to restore later
    const currentPage = rendererInstance.sessionManager.sessionData.currentPage;
    const pages = [];

    // Capture each page's DOM content
    for (let i = 0; i < sessionPages.length; i++) {
      // Switch to the page we want to capture
      rendererInstance.sessionManager.sessionData.currentPage = i;
      rendererInstance.navigatePage(0);

      // Wait a moment for the page to render
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get the page element
      const pageElement = document.getElementById("a4Page");
      if (pageElement) {
        pages.push(pageElement.cloneNode(true));
        console.log(`Captured page ${i + 1} of ${sessionPages.length}`);
      }
    }

    // Restore original page
    rendererInstance.sessionManager.sessionData.currentPage = currentPage;
    rendererInstance.navigatePage(0);

    // Set the pages in the preview
    this.printPreview.setPages(pages);
    console.log("Print preview updated with", pages.length, "pages");

    // Get available printers
    await this.refreshPrinters();

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  createPrintDialog() {
    this.dialog = document.createElement("div");
    this.dialog.className = "print-dialog-overlay";

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
    const printDialog = this.dialog.querySelector(".print-dialog");
    printDialog.appendChild(this.printPreview.getElement());

    // Add event listeners
    this.setupEventListeners();

    // Add to document
    document.body.appendChild(this.dialog);
  }

  setupEventListeners() {
    // Printer search
    this.dialog
      .querySelector("#printerSearch")
      .addEventListener("input", (e) => {
        this.filterPrinters(e.target.value);
      });

    // Refresh printers
    this.dialog
      .querySelector("#refreshPrinters")
      .addEventListener("click", () => {
        this.refreshPrinters();
      });

    // Print button
    this.dialog.querySelector("#confirmPrint").addEventListener("click", () => {
      this.executePrint();
    });

    // Cancel button
    this.dialog.querySelector("#cancelPrint").addEventListener("click", () => {
      this.closeDialog(false);
    });

    // Zoom controls
    this.dialog.querySelector("#zoomIn").addEventListener("click", () => {
      this.zoom(10);
    });

    this.dialog.querySelector("#zoomOut").addEventListener("click", () => {
      this.zoom(-10);
    });

    // Page range toggle
    const pageRadios = this.dialog.querySelectorAll('input[name="pages"]');
    const pageRangeInput = this.dialog.querySelector(".page-ranges");
    pageRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        pageRangeInput.disabled = e.target.value === "all";
      });
    });
  }

  prepareContent(content) {
    const clone = content.cloneNode(true);

    // Remove empty placeholders
    clone
      .querySelectorAll(".photo-placeholder:not(:has(img))")
      .forEach((p) => p.remove());

    // Remove edit overlays
    clone.querySelectorAll(".edit-overlay").forEach((o) => o.remove());

    // Remove placeholder styling
    clone.querySelectorAll(".photo-placeholder").forEach((p) => {
      p.style.border = "none";
      p.style.background = "none";
    });

    return clone;
  }

  filterPrinters(searchTerm) {
    const select = this.dialog.querySelector("#printerSelect");
    const filtered = this.printerList.filter((printer) =>
      printer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    select.innerHTML = filtered
      .map(
        (printer) => `<option value="${printer.name}">${printer.name}</option>`
      )
      .join("");
  }

  zoom(delta) {
    this.currentSettings.zoom = Math.max(
      25,
      Math.min(200, this.currentSettings.zoom + delta)
    );
    this.dialog.querySelector(
      "#zoomLevel"
    ).textContent = `${this.currentSettings.zoom}%`;

    // Calculate scale based on container size
    const previewContent = this.dialog.querySelector(".preview-content");
    const page = this.dialog.querySelector(".a4-page");

    if (page) {
      const scale = (this.currentSettings.zoom / 100) * 0.8; // Base scale is 0.8
      page.style.setProperty("--preview-scale", scale);
    }
  }

  initializePreview() {
    const previewContent = this.dialog.querySelector(".preview-content");
    const page = previewContent.querySelector(".a4-page");

    if (page) {
      // Set initial scale to fit container
      page.style.setProperty("--preview-scale", "0.5");
    }
  }

  setupToastContainer() {
    if (!this.toastContainer) {
      // Check if it already exists
      this.toastContainer = document.createElement("div");
      this.toastContainer.className = "toast-container";
      document.body.appendChild(this.toastContainer);
      console.log("Created new toast container"); // Debug log
    }
  }

  showToast(message) {
    console.log("Creating toast with message:", message); // Debug log
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    console.log("Toast container:", this.toastContainer); // Debug log
    this.toastContainer.appendChild(toast);

    // Remove the toast after animation
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  closeDialog(success) {
    this.dialog.style.display = "none";
    if (this.resolvePromise) {
      this.resolvePromise(success);
    }
  }

  getAllPages() {
    // Get all pages from the document
    const pages = [];
    const pageContainer = document.getElementById("pageContainer");

    if (pageContainer) {
      // Get all A4 pages
      const a4Pages = pageContainer.querySelectorAll(".a4-page");
      a4Pages.forEach((page) => {
        pages.push(page);
      });
    }

    return pages;
  }

  async updatePrinterStatuses() {
    try {
      // Get fresh printer data from Windows API
      const result = await window.electron.winPrint.getPrinters();
      if (result.success) {
        // Update the printer list with new status information
        this.printerList = result.printers.map((printer) => ({
          ...printer,
          statusText: this.getPrinterStatusText(printer.status, printer.name),
        }));

        // Update the dropdown to reflect new status
        this.updatePrinterDropdown();

        // If a printer is selected, check if its status has changed
        const selectedPrinter =
          this.dialog?.querySelector("#printerSelect")?.value;
        if (selectedPrinter) {
          const printer = this.printerList.find(
            (p) => p.name === selectedPrinter
          );
          if (printer && !printer.statusText.ready) {
            // Optionally notify user if selected printer becomes unavailable
            console.warn(
              `Selected printer "${selectedPrinter}" status: ${printer.statusText.text}`
            );
          }
        }
      } else {
        console.error("Failed to update printer statuses:", result.error);
      }
    } catch (error) {
      console.error("Error updating printer statuses:", error);
    }
  }

  cleanup() {
    if (this.printerStatusInterval) {
      clearInterval(this.printerStatusInterval);
      this.printerStatusInterval = null;
    }
  }
}

// Export the PrintManager
window.PrintManager = PrintManager;

// Add this right after the PrintManager class definition but before the export
window.testToast = function () {
  const manager = new PrintManager();
  manager.showToast("Test Message");
};
