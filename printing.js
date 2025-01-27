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

    // Remove initializePrinterMonitoring from constructor
    // We'll call it after dialog is created instead

    // Clean up interval when window is closed
    window.addEventListener("beforeunload", () => {
      if (this.printerStatusInterval) {
        clearInterval(this.printerStatusInterval);
      }
    });
  }

  initializePrinterMonitoring() {
    // Clear any existing interval
    if (this.printerStatusInterval) {
      clearInterval(this.printerStatusInterval);
    }

    // Initial printer status update
    this.updatePrinterStatuses();

    // Set up periodic printer status updates
    this.printerStatusInterval = setInterval(() => {
      this.updatePrinterStatuses();
    }, 5000); // Update every 5 seconds
  }

  async refreshPrinters() {
    try {
      console.log("=== Refreshing Printers ===");
      // Only proceed if dialog exists
      if (!this.dialog) {
        console.log("Dialog not found, skipping printer refresh");
        return;
      }

      // Show loading indicator
      const refreshButton = this.dialog.querySelector("#refreshPrinters");
      const originalContent = refreshButton.innerHTML;
      refreshButton.innerHTML = "🔄 Scanning...";
      refreshButton.disabled = true;
      console.log("Started printer scan");

      // Get printers from Windows API
      const result = await window.electron.winPrint.getPrinters();
      if (result.success) {
        this.printerList = result.printers.map((printer) => ({
          ...printer,
          statusText: this.getPrinterStatusText(printer.status, printer.name),
        }));

        // Update the dropdown
        this.updatePrinterDropdown();
        console.log(`Found ${this.printerList.length} printers`);

        // Show success message
        this.showToast(`Found ${this.printerList.length} printers`);
      } else {
        console.error("Failed to get printers:", result.error);
        this.showToast("Failed to refresh printer list");
      }

      // Restore refresh button
      refreshButton.innerHTML = originalContent;
      refreshButton.disabled = false;
      console.log("=== Printer Refresh Complete ===");
    } catch (error) {
      console.error("Error refreshing printers:", error);
      this.showToast("Error refreshing printer list");
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
    console.log("\n=== PRINTER DROPDOWN UPDATE STARTED ===");
    const select = this.dialog.querySelector("#printerSelect");
    const searchTerm = this.dialog
      .querySelector("#printerSearch")
      .value.toLowerCase();

    // Store currently selected printer
    const selectedPrinterName = select.value;
    console.log("Current selected printer before update:", selectedPrinterName);

    // Filter printers based on search term
    const filteredPrinters = this.printerList.filter((printer) =>
      printer.name.toLowerCase().includes(searchTerm)
    );

    // Sort printers: Selected printer first, then physical printers, then virtual printers
    const sortedPrinters = filteredPrinters.sort((a, b) => {
      // If one is the selected printer, it should come first
      if (a.name === selectedPrinterName) return -1;
      if (b.name === selectedPrinterName) return 1;

      // Then sort by virtual/physical status
      const aIsVirtual = a.statusText.text === "Virtual Printer";
      const bIsVirtual = b.statusText.text === "Virtual Printer";
      if (aIsVirtual && !bIsVirtual) return 1;
      if (!aIsVirtual && bIsVirtual) return -1;

      // Finally sort alphabetically
      return a.name.localeCompare(b.name);
    });

    console.log("Total printers after filtering:", filteredPrinters.length);

    // Clear existing options
    select.innerHTML = "";

    // Add filtered and sorted printers to dropdown
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

      // Set selected attribute if this is the selected printer
      if (printer.name === selectedPrinterName) {
        option.selected = true;
        console.log("Found and marked selected printer:", printer.name);
      }

      select.appendChild(option);
    });

    // Ensure the selected printer is still selected
    if (selectedPrinterName) {
      select.value = selectedPrinterName;
      console.log("Final selected printer:", select.value);
      console.log(
        "Selected printer text:",
        select.options[select.selectedIndex]?.text
      );
    }

    console.log("=== PRINTER DROPDOWN UPDATE COMPLETED ===\n");
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

    // Removed printer status check to allow printing to any printer

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async executePrint() {
    try {
      // Gather all settings
      const settings = {
        printer: this.dialog.querySelector("#printerSelect").value,
        copies: parseInt(this.dialog.querySelector("#copiesInput").value),
        layout: this.dialog.querySelector('input[name="layout"]:checked').value,
        pages: this.dialog.querySelector('input[name="pages"]:checked').value,
        pageRanges: this.dialog.querySelector(".page-ranges").value,
        quality: parseInt(this.dialog.querySelector("#printQuality").value),
        paperType: this.dialog.querySelector('input[name="paperType"]:checked').value,
      };

      console.log("Print settings:", settings);

      // Validate settings
      const validation = await this.validatePrintJob(settings);
      if (!validation.isValid) {
        this.showToast(validation.errors.join('\n'));
        return;
      }

      // Send to print using Windows printing with existing temp file
      const result = await window.electron.winPrint.printFile("temp/currentLayout.html", settings.printer);
      console.log("Print result:", result);

      if (result.success) {
        this.showToast(`Successfully sent to printer: ${settings.printer}`);
        this.closeDialog(true);
      } else {
        throw new Error(result.error || result.message || "Print failed");
      }
    } catch (error) {
      console.error("Print error:", error);
      this.showToast(
        `Print failed: ${error.message}\n\nPlease check if:\n` +
        "- Printer software is installed\n" +
        "- Print service is running\n" +
        "- You have necessary permissions"
      );
    }
  }

  async showPrintDialog(contentToprint) {
    console.log("=== Print Dialog Opening ===");
    if (!this.dialog) {
      console.log("Creating new print dialog");
      this.createPrintDialog();
      // Initialize printer monitoring after dialog is created
      this.initializePrinterMonitoring();
    }

    // Initialize print preview if not already done
    if (!this.printPreview) {
      console.log("Initializing print preview");
      this.printPreview = new PrintPreview();
    }

    // Show the dialog
    console.log("Showing dialog");
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

    // Wait for UI to be fully rendered before refreshing printers
    console.log("Waiting for UI to render before refreshing printers...");
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("Starting printer refresh");
    await this.refreshPrinters();
    console.log("=== Print Dialog Setup Complete ===");

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  createPrintDialog() {
    this.dialog = document.createElement("div");
    this.dialog.className = "print-dialog-overlay";
    console.log("this.dialog", this.dialog);
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

                <div class="print-preview-section">
                    <!-- Print preview will be inserted here -->
                </div>
            </div>
        `;

    // Get the print preview section and insert the preview
    const previewSection = this.dialog.querySelector(".print-preview-section");
    previewSection.appendChild(this.printPreview.getElement());

    // Add event listeners
    this.setupEventListeners();

    // Add to document
    document.body.appendChild(this.dialog);

    // Make dialog visible
    this.dialog.style.display = "flex";

    // Add change event listener to printer select
    const printerSelect = this.dialog.querySelector("#printerSelect");
    printerSelect.addEventListener("change", (e) => {
      console.log("\n=== PRINTER SELECTION CHANGED ===");
      console.log("Previous printer:", this.currentSettings?.printer);
      console.log("Newly selected printer:", e.target.value);
      console.log(
        "Selected printer text:",
        e.target.options[e.target.selectedIndex].text
      );

      this.currentSettings.printer = e.target.value;

      console.log(
        "Settings updated - current printer:",
        this.currentSettings.printer
      );
      console.log("=== PRINTER SELECTION COMPLETED ===\n");
    });
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

  // Add this method to show more detailed printer info
  showPrinterDetails(printer) {
    const details = [
      `Status: ${printer.statusText.text}`,
      `Type: ${printer.isNetwork ? "Network" : "Local"}`,
      printer.location ? `Location: ${printer.location}` : null,
      printer.isShared ? "Shared printer" : null,
      printer.error ? `Warning: ${printer.error}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Show details in a tooltip or info panel
    console.log(`Printer details for ${printer.name}:`, details);
  }

  async getPrinterStatus(printerName) {
    try {
      const printers = await window.electron.winPrint.getPrinters();
      const printer = printers.find((p) => p.name === printerName);

      if (!printer) {
        return "Unknown";
      }

      // Map Windows printer status codes to readable states
      const statusMap = {
        0: "Ready", // PRINTER_STATUS_READY
        1: "Paused",
        2: "Error",
        3: "Pending Deletion",
        4: "Paper Jam",
        5: "Paper Out",
        6: "Manual Feed",
        7: "Paper Problem",
        8: "Offline",
        9: "IO Active",
        10: "Busy",
        11: "Printing",
        12: "Output Bin Full",
        13: "Not Available",
        14: "Waiting",
        15: "Processing",
        16: "Initializing",
        17: "Warming Up",
        18: "Toner Low",
        19: "No Toner",
        20: "Page Punt",
        21: "User Intervention Required",
        22: "Out of Memory",
        23: "Door Open",
        24: "Server Unknown",
        25: "Power Save",
      };

      // If printer is in power save mode or warming up, consider it "Ready"
      if (printer.status === 25 || printer.status === 17) {
        return "Ready";
      }

      // Return mapped status or 'Unknown' if status code isn't recognized
      return statusMap[printer.status] || "Unknown";
    } catch (error) {
      console.error("Error getting printer status:", error);
      return "Unknown";
    }
  }

  async updatePrinterList() {
    try {
      const result = await window.electron.winPrint.getPrinters();
      if (!result.success) {
        throw new Error(result.error || "Failed to get printers");
      }

      const select = this.dialog.querySelector("#printerSelect");
      select.innerHTML = "";

      for (const printer of result.printers) {
        const status = this.interpretPrinterStatus(printer.status, printer);
        const option = document.createElement("option");
        option.value = printer.name;

        // Create status indicator
        const statusColor = this.getPrinterStatusColor(status);
        option.innerHTML = `<span style="color: ${statusColor}">●</span> ${printer.name} - ${status}`;

        // Allow all physical printers to be selected, regardless of status
        option.disabled = false;

        select.appendChild(option);
      }

      // Show total number of printers found
      console.log(`Found ${result.printers.length} physical printers`);
    } catch (error) {
      console.error("Error updating printer list:", error);
    }
  }

  interpretPrinterStatus(statusCode, printer) {
    // Status codes for network printers might be different
    if (printer.isNetwork) {
      // For network printers, assume ready unless explicitly offline
      if (statusCode === 0) return "Ready";
      if (statusCode & 0x400000) return "Offline"; // PRINTER_STATUS_OFFLINE
      return "Ready"; // Default to Ready for network printers
    }

    // Status mapping for local printers
    const statusMap = {
      0: "Ready",
      1: "Paused",
      2: "Error",
      3: "Pending Deletion",
      4: "Paper Jam",
      5: "Paper Out",
      6: "Manual Feed",
      7: "Paper Problem",
      8: "Offline",
      9: "IO Active",
      10: "Busy",
      11: "Printing",
      12: "Output Bin Full",
      13: "Not Available",
      14: "Waiting",
      15: "Processing",
      16: "Initializing",
      17: "Warming Up",
      18: "Toner Low",
      19: "No Toner",
      20: "Page Punt",
      21: "User Intervention Required",
      22: "Out of Memory",
      23: "Door Open",
      24: "Server Unknown",
      25: "Power Save",
    };

    // Special cases
    if (statusCode === 25 || statusCode === 17) return "Ready"; // Power Save or Warming Up
    if (printer.isReady) return "Ready";

    return statusMap[statusCode] || "Ready"; // Default to Ready if status is unknown
  }

  getPrinterStatusColor(status) {
    const statusColors = {
      Ready: "#2ecc71", // Green
      "Power Save": "#2ecc71", // Green
      "Warming Up": "#2ecc71", // Green
      Printing: "#f1c40f", // Yellow
      Busy: "#f1c40f", // Yellow
      Offline: "#e74c3c", // Red
      Error: "#e74c3c", // Red
      Unknown: "#e74c3c", // Red
    };
    return statusColors[status] || "#95a5a6"; // Default gray
  }
}

// Export the PrintManager
window.PrintManager = PrintManager;

// Add this right after the PrintManager class definition but before the export
window.testToast = function () {
  const manager = new PrintManager();
  manager.showToast("Test Message");
};
