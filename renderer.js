import layout from "./layoutRenderer.js";
// SessionStateManager to handle all session data
class SessionStateManager {
  constructor() {
    this.sessionData = {
      pages: [],
      currentPage: 0,
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
      action: actionName,
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
      cards: [],
    };
    this.sessionData.pages.push(newPage);
    this.saveState("Create Page");
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
          height: cardData.height,
        },
        image: null,
        imageSettings: {
          rotation: 0,
          zoom: 100,
          translateX: 0,
          translateY: 0,
          fit: "contain",
        },
      };
      layout.setCardSize(card, pageNumber);
      page.cards.push(card);
      this.saveState("Add Card");
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
        originalHeight: imageData.originalHeight,
      };
      if (!card.imageSettings) {
        card.imageSettings = {
          rotation: 0,
          zoom: 100,
          translateX: 0,
          translateY: 0,
          fit: "contain",
        };
      }
      this.saveState("Add Image");
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
        ...settings,
      };
      this.saveState("Edit Image");
      return true;
    }
    return false;
  }

  // Get page data
  getPage(pageNumber) {
    return this.sessionData.pages.find(
      (page) => page.pageNumber === pageNumber
    );
  }

  // Get card data
  getCard(pageNumber, cardId) {
    const page = this.getPage(pageNumber);
    if (page) {
      return page.cards.find((card) => card.id === cardId);
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
    this.layoutRenderer = layout;
    this.initializeElements();
    this.bindEvents();
    // Make the instance globally available
    window.rendererInstance = this;
    // Add version display
    this.displayAppVersion();
  }

  async displayAppVersion() {
    try {
      const version = await window.electron.getAppVersion();
      const versionElement = document.getElementById("app-version");
      if (versionElement) {
        versionElement.textContent = `v${version}`;
      }
    } catch (error) {
      console.error("Error getting app version:", error);
    }
  }

  initializeElements() {
    this.pageContainer = document.getElementById("a4Page");
    this.modal = document.getElementById("sizeModal");
    this.addPageBtn = document.getElementById("addPage");
    this.prevPageBtn = document.getElementById("prevPage");
    this.nextPageBtn = document.getElementById("nextPage");
    this.pageIndicator = document.getElementById("pageIndicator");

    // Show size selection modal on start
    this.showSizeModal();
  }

  bindEvents() {
    this.addPageBtn.addEventListener("click", () => this.addNewPage());
    this.prevPageBtn.addEventListener("click", () => this.navigatePage(-1));
    this.nextPageBtn.addEventListener("click", () => this.navigatePage(1));

    // Add reset button event listener
    document
      .getElementById("resetProject")
      .addEventListener("click", () => this.resetProject());

    // Add edit size button event listener
    document
      .getElementById("editSize")
      .addEventListener("click", () => this.showSizeModal(true));

    // Add close button event listener for size modal
    document.getElementById("closeSizeModal").addEventListener("click", () => {
      this.modal.style.display = "none";
      // If this is a new page and no size was selected, remove the page
      if (this.sessionManager.sessionData.pages.length > 0) {
        const currentPage = this.sessionManager.getPage(
          this.sessionManager.sessionData.currentPage + 1
        );
        if (!currentPage.pageSize) {
          this.sessionManager.sessionData.pages.pop();
          this.sessionManager.sessionData.currentPage = Math.max(
            0,
            this.sessionManager.sessionData.pages.length - 1
          );
          this.updatePageIndicator();
        }
      }
    });

    // Move selectedSize to class property
    this.selectedSize = null;
    const applyToPageBtn = document.getElementById("applyToPage");
    applyToPageBtn.disabled = true; // Initially disable the button

    // Handle custom size checkbox
    const customSizeCheckbox = document.getElementById("enableCustomSize");
    const customSizeSection = document.getElementById("customSizeSection");
    const customWidthInput = document.getElementById("customWidth");
    const customHeightInput = document.getElementById("customHeight");
    const applyCustomSizeBtn = document.getElementById("applyCustomSize");

    // Validate if a size fits on an A4 page
    const validateSize = (width, height) => {
      const PAGE_WIDTH = 210;
      const PAGE_HEIGHT = 297;
      const MARGIN = 5;
      const SPACING = 10;

      const availableWidth = PAGE_WIDTH - 2 * MARGIN;
      const availableHeight = PAGE_HEIGHT - 2 * MARGIN;

      const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
      const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));

      return cols > 0 && rows > 0;
    };

    // Update preset size button handling
    document.querySelectorAll(".size-options button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const [width, height] = e.target.dataset.size
          .split("x")
          .map((n) => parseInt(n));

        // Validate size immediately
        if (!validateSize(width, height)) {
          alert("Selected size is too large for A4 page");
          return;
        }

        // Uncheck custom size checkbox if a preset is selected
        customSizeCheckbox.checked = false;
        customSizeSection.classList.remove("enabled");
        customWidthInput.disabled = true;
        customHeightInput.disabled = true;
        applyCustomSizeBtn.disabled = true;

        // Update selected size
        this.selectedSize = e.target.dataset.size;
        applyToPageBtn.disabled = false;

        // Highlight the selected button
        document.querySelectorAll(".size-options button").forEach((btn) => {
          btn.classList.remove("selected");
        });
        e.target.classList.add("selected");
      });
    });

    // Handle Apply To Page button
    applyToPageBtn.addEventListener("click", () => {
      if (this.selectedSize) {
        this.setPageSize(this.selectedSize);
        this.modal.style.display = "none";

        // Reset selection state
        this.selectedSize = null;
        applyToPageBtn.disabled = true;
        document.querySelectorAll(".size-options button").forEach((btn) => {
          btn.classList.remove("selected");
        });
      }
    });

    // Update Apply Custom Size handler
    document.getElementById("applyCustomSize").addEventListener("click", () => {
      const width = parseInt(customWidthInput.value);
      const height = parseInt(customHeightInput.value);

      // Validate custom size immediately
      if (!validateSize(width, height)) {
        alert("Selected size is too large for A4 page");
        return;
      }

      if (
        this.validateInput(
          customWidthInput,
          1,
          210,
          document.getElementById("widthValidation")
        ) &&
        this.validateInput(
          customHeightInput,
          1,
          297,
          document.getElementById("heightValidation")
        )
      ) {
        this.selectedSize = `${width}x${height}`;
        applyToPageBtn.disabled = false;
      }
    });

    // Handle custom size validation
    customWidthInput.addEventListener("input", (e) => {
      // Allow only numbers and backspace
      let value = e.target.value.replace(/[^\d]/g, "");
      if (value !== e.target.value) {
        e.target.value = value;
      }
      this.validateInput(
        e.target,
        1,
        210,
        document.getElementById("widthValidation")
      );
    });

    customHeightInput.addEventListener("input", (e) => {
      // Allow only numbers and backspace
      let value = e.target.value.replace(/[^\d]/g, "");
      if (value !== e.target.value) {
        e.target.value = value;
      }
      this.validateInput(
        e.target,
        1,
        297,
        document.getElementById("heightValidation")
      );
    });

    // Update custom size checkbox handler
    customSizeCheckbox.addEventListener("change", (e) => {
      customSizeSection.classList.toggle("enabled", e.target.checked);
      customWidthInput.disabled = !e.target.checked;
      customHeightInput.disabled = !e.target.checked;

      if (e.target.checked) {
        // Clear input values when enabling
        customWidthInput.value = "";
        customHeightInput.value = "";
        // Validate both inputs immediately when enabling
        this.validateInput(
          customWidthInput,
          1,
          210,
          document.getElementById("widthValidation")
        );
        this.validateInput(
          customHeightInput,
          1,
          297,
          document.getElementById("heightValidation")
        );
        // Clear any preset selection
        document.querySelectorAll(".size-options button").forEach((btn) => {
          btn.classList.remove("selected");
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
    document
      .getElementById("saveLayout")
      .addEventListener("click", () => this.saveLayout());
    document
      .getElementById("loadLayout")
      .addEventListener("click", () => this.loadLayout());
    document
      .getElementById("exportPDF")
      .addEventListener("click", () => this.exportToPDF());
    document
      .getElementById("printPreview")
      .addEventListener("click", () => this.showPrintPreview());
    document
      .getElementById("undo")
      .addEventListener("click", () => this.undo());
    document
      .getElementById("redo")
      .addEventListener("click", () => this.redo());
  }

  validateInput(input, min, max, validationMsg) {
    // Allow empty or partial input
    if (input.value === "" || input.value === "-") {
      input.classList.add("invalid");
      validationMsg.classList.add("show");
      document.getElementById("applyCustomSize").disabled = true;
      return false;
    }

    const value = parseInt(input.value);
    const isValid = !isNaN(value) && value >= min && value <= max;

    input.classList.toggle("invalid", !isValid);
    validationMsg.classList.toggle("show", !isValid);

    // Check both inputs for validity
    const widthInput = document.getElementById("customWidth");
    const heightInput = document.getElementById("customHeight");

    // Check if both inputs have valid values
    const widthValue = parseInt(widthInput.value);
    const heightValue = parseInt(heightInput.value);

    const widthValid =
      !isNaN(widthValue) && widthValue >= 1 && widthValue <= 210;
    const heightValid =
      !isNaN(heightValue) && heightValue >= 1 && heightValue <= 297;

    // Enable button only if BOTH inputs are valid
    document.getElementById("applyCustomSize").disabled = !(
      widthValid && heightValid
    );

    return isValid;
  }

  setPageSize(size) {
    // Parse size string to get dimensions
    let [width, height] = size.split("x").map((n) => parseInt(n));

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
      if (
        oldSize &&
        oldSize !== size &&
        page.cards.some((card) => card.image)
      ) {
        const proceed = confirm(
          "Changing the size will remove all existing photos. Do you want to continue?"
        );
        if (!proceed) {
          page.pageSize = oldSize;
          this.modal.style.display = "none";
          return false;
        }
      }
      page.cards = []; // Clear existing cards
    }

    // Clear existing placeholders
    this.pageContainer.innerHTML = "";

    // Add delete button to page
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "page-delete-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.deletePage(pageNumber + 1);
    };
    this.pageContainer.appendChild(deleteBtn);

    // Calculate grid layout
    const availableWidth = PAGE_WIDTH - 2 * MARGIN;
    const availableHeight = PAGE_HEIGHT - 2 * MARGIN;
    const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
    const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));

    // Create placeholders
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = MARGIN + col * (width + SPACING);
        const y = MARGIN + row * (height + SPACING);

        // Add card to session state
        const cardData = {
          position: { x, y },
          width: width,
          height: height,
        };
        const card = this.sessionManager.addCard(page.pageNumber, cardData);

        // Create DOM element
        const placeholder = document.createElement("div");
        placeholder.className = "photo-placeholder";
        placeholder.id = card.id;

        Object.assign(placeholder.style, {
          width: `${width}mm`,
          height: `${height}mm`,
          left: `${x}mm`,
          top: `${y}mm`,
          position: "absolute",
        });

        this.pageContainer.appendChild(placeholder);
        this.setupDropZone(placeholder, card.id);
      }
    }

    // Close the modal
    this.modal.style.display = "none";

    // Update layout state after all changes
    this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
    return true;
  }

  deletePage(pageNumber) {
    if (this.sessionManager.sessionData.pages.length <= 1) {
      alert("Cannot delete the last page. At least one page must remain.");
      return;
    }

    const confirmed = confirm("Are you sure you want to delete this page?");
    if (confirmed) {
      // Remove the page from session data
      this.sessionManager.sessionData.pages =
        this.sessionManager.sessionData.pages.filter(
          (page) => page.pageNumber !== pageNumber
        );

      // Renumber remaining pages
      this.sessionManager.sessionData.pages.forEach((page, index) => {
        page.pageNumber = index + 1;
      });

      // Update current page if necessary
      if (
        this.sessionManager.sessionData.currentPage >=
        this.sessionManager.sessionData.pages.length
      ) {
        this.sessionManager.sessionData.currentPage =
          this.sessionManager.sessionData.pages.length - 1;
      }

      // Save state
      this.sessionManager.saveState("Delete Page");

      // Update the view
      this.updatePageIndicator();
      this.navigatePage(0); // Refresh current page view
    }

    // Update layout state after deletion
    this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
  }

  handleImageDrop(e, placeholder, cardId) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const imageData = {
          src: event.target.result,
          originalWidth: img.width,
          originalHeight: img.height,
        };

        // Update session and layout state
        const pageNumber = this.sessionManager.sessionData.currentPage + 1;
        this.sessionManager.setCardImage(pageNumber, cardId, imageData);
        this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);

        // Update display
        this.updateCardDisplay(placeholder, imageData);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateCardDisplay(placeholder, imageData) {
    placeholder.innerHTML = "";

    // Get the current card settings
    const pageNumber = this.sessionManager.sessionData.currentPage + 1;
    const cardId = placeholder.id;
    const card = this.sessionManager.getCard(pageNumber, cardId);

    if (!card) return;

    // Create image container
    const container = document.createElement("div");
    container.className = "image-container";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.position = "relative";
    container.style.overflow = "hidden";

    // Create and setup image
    const img = document.createElement("img");
    img.src = imageData.src;
    img.style.position = "absolute";
    img.style.left = "50%";
    img.style.top = "50%";

    // Use the card's image settings if they exist, otherwise use defaults
    const settings = card.imageSettings || {
      fit: "contain",
      objectFit: "contain",
      width: "100%",
      height: "100%",
      rotation: 0,
      zoom: 100,
      translateX: 0,
      translateY: 0,
    };

    // Apply image settings
    img.style.objectFit = settings.objectFit;
    img.style.width = settings.width;
    img.style.height = settings.height;

    // Build transform
    const transform = [];
    transform.push("translate(-50%, -50%)"); // Center the image

    if (settings.translateX || settings.translateY) {
      transform.push(
        `translate(${settings.translateX}px, ${settings.translateY}px)`
      );
    }

    if (settings.rotation) {
      transform.push(`rotate(${settings.rotation}deg)`);
    }

    if (settings.zoom) {
      transform.push(`scale(${settings.zoom / 100})`);
    }

    img.style.transform = transform.join(" ");

    // Add image to container
    container.appendChild(img);
    placeholder.appendChild(container);

    // Add edit overlay with cardId
    this.addEditOverlay(placeholder, cardId);
  }

  setupDragAndDrop() {
    this.pageContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    this.pageContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;

      if (files.length > 0 && files[0].type.startsWith("image/")) {
        const target = e.target.closest(".photo-placeholder");
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
    this.modal.style.display = "block";

    // Update the Apply To Page button text based on context
    const applyToPageBtn = document.getElementById("applyToPage");
    applyToPageBtn.textContent = isEdit ? "Update Size" : "Apply To Page";

    // Clear any previous selections
    document.querySelectorAll(".size-options button").forEach((btn) => {
      btn.classList.remove("selected");
    });

    // Reset custom size inputs
    document.getElementById("enableCustomSize").checked = false;
    document.getElementById("customWidth").disabled = true;
    document.getElementById("customHeight").disabled = true;
    document.getElementById("applyCustomSize").disabled = true;
    document.getElementById("customSizeSection").classList.remove("enabled");
  }

  addNewPage() {
    // Create a new page in the session manager
    const newPageNumber = this.sessionManager.sessionData.pages.length + 1;
    this.sessionManager.sessionData.pages.push({
      pageNumber: newPageNumber,
      pageSize: null,
      cards: [],
    });

    // Update current page to the new page
    this.sessionManager.sessionData.currentPage = newPageNumber - 1;

    // Update the page indicator
    this.updatePageIndicator();

    // Show the size modal for the new page
    this.showSizeModal();

    // Update layout state after adding page
    this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
  }

  navigatePage(direction) {
    const newPage = this.sessionManager.sessionData.currentPage + direction;
    if (
      newPage >= 0 &&
      newPage < this.sessionManager.sessionData.pages.length
    ) {
      this.sessionManager.sessionData.currentPage = newPage;
      this.updatePageIndicator();

      // Get the current page data
      const currentPage = this.sessionManager.getPage(newPage + 1);
      if (currentPage && currentPage.pageSize) {
        // Clear the current page container
        this.pageContainer.innerHTML = "";

        // Add delete button to page
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "page-delete-btn";
        deleteBtn.innerHTML = "×";
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          this.deletePage(newPage + 1);
        };
        this.pageContainer.appendChild(deleteBtn);

        // Recreate the layout with the page's size
        const [width, height] = currentPage.pageSize
          .split("x")
          .map((n) => parseInt(n));
        const PAGE_WIDTH = 210;
        const PAGE_HEIGHT = 297;
        const MARGIN = 5;
        const SPACING = 10;

        const availableWidth = PAGE_WIDTH - 2 * MARGIN;
        const availableHeight = PAGE_HEIGHT - 2 * MARGIN;

        const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
        const rows = Math.floor(
          (availableHeight + SPACING) / (height + SPACING)
        );

        // Get the latest cards with their settings from the session manager
        const latestCards = this.sessionManager.getPageCards(newPage + 1);
        console.log("During page navigation - Latest cards:", {
          pageNumber: newPage + 1,
          latestCards,
          currentPageCards: currentPage.cards,
        });
        if (latestCards) {
          currentPage.cards = latestCards;
        }

        // Recreate each card and restore its image if it exists
        currentPage.cards.forEach((card) => {
          const placeholder = document.createElement("div");
          placeholder.className = "photo-placeholder";
          placeholder.id = card.id;

          Object.assign(placeholder.style, {
            width: `${card.size.width}mm`,
            height: `${card.size.height}mm`,
            left: `${card.position.x}mm`,
            top: `${card.position.y}mm`,
            position: "absolute",
          });

          this.pageContainer.appendChild(placeholder);
          this.setupDropZone(placeholder, card.id);

          // Restore image if it exists
          if (card.image) {
            this.updateCardDisplay(placeholder, card.image);
          }
        });

        // Update layout state after recreating the page
        this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
      }
    }
  }

  updatePageIndicator() {
    this.pageIndicator.textContent = `Page ${
      this.sessionManager.sessionData.currentPage + 1
    } of ${this.sessionManager.sessionData.pages.length}`;
  }

  executeCommand(command) {
    command.execute();
    this.commandHistory.splice(this.commandIndex + 1);
    this.commandHistory.push(command);
    this.commandIndex++;
  }

  undo() {
    if (this.sessionManager.undo()) {
      this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
      // Refresh the current page view
      this.navigatePage(0);
      this.updatePageIndicator();
    }
  }

  redo() {
    if (this.sessionManager.redo()) {
      this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
      // Refresh the current page view
      this.navigatePage(0);
      this.updatePageIndicator();
    }
  }

  async saveLayout() {
    try {
      // Prepare the complete layout data
      const layoutData = {
        version: "1.0", // For future compatibility
        timestamp: new Date().toISOString(),
        sessionData: {
          pages: this.sessionManager.sessionData.pages.map((page) => ({
            ...page,
            cards: page.cards.map((card) => ({
              ...card,
              // Ensure we save all necessary card data
              position: { ...card.position },
              size: { ...card.size },
              image: card.image
                ? {
                    ...card.image,
                    // Keep the image data
                    src: card.image.src,
                  }
                : null,
              imageSettings: card.imageSettings
                ? {
                    ...card.imageSettings,
                  }
                : null,
            })),
          })),
          currentPage: this.sessionManager.sessionData.currentPage,
        },
        // Save history for undo/redo functionality
        history: this.sessionManager.history,
        currentHistoryIndex: this.sessionManager.currentHistoryIndex,
      };

      const result = await window.electron.invoke("save-layout", layoutData);
      if (result) {
        this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
        alert("Layout saved successfully!");
      } else {
        throw new Error("Failed to save layout");
      }
    } catch (error) {
      console.error("Error saving layout:", error);
      alert("Failed to save layout. Please try again.");
    }
  }

  async loadLayout() {
    try {
      const layoutData = await window.electron.invoke("load-layout");
      if (layoutData) {
        // Validate version compatibility if needed
        if (layoutData.version && layoutData.version !== "1.0") {
          console.warn(
            "Loading layout from different version:",
            layoutData.version
          );
        }

        // Restore session state
        this.sessionManager.loadSessionState(layoutData.sessionData);

        // Restore history if available
        if (layoutData.history) {
          this.sessionManager.history = layoutData.history;
          this.sessionManager.currentHistoryIndex =
            layoutData.currentHistoryIndex;
        }

        // Update the UI
        this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
        this.updatePageIndicator();
        this.navigatePage(0); // Refresh current page view

        alert("Layout loaded successfully!");
      }
    } catch (error) {
      console.error("Error loading layout:", error);
      alert(
        "Failed to load layout. The file might be corrupted or in an incompatible format."
      );
    }
  }

  async exportToPDF() {
    try {
      // Store current page to restore it later
      const currentPageIndex = this.sessionManager.sessionData.currentPage;

      // Create PDF with A4 dimensions (210mm x 297mm)
      const pdf = new window.jspdf.jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Create a temporary container for the HTML content
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      document.body.appendChild(tempContainer);

      // Generate HTML for all pages
      tempContainer.innerHTML = this.layoutRenderer.generateHTML();

      // Process each page
      for (let i = 0; i < this.sessionManager.sessionData.pages.length; i++) {
        // Get the page element
        const pageElement = tempContainer.querySelector(
          `[data-page="${i + 1}"]`
        );
        if (!pageElement) continue;

        // Show current page and hide others
        pageElement.style.display = "block";

        // Hide empty placeholders before capture
        const emptyPlaceholders = pageElement.querySelectorAll(
          ".photo-placeholder:not(:has(img))"
        );
        emptyPlaceholders.forEach((placeholder) => {
          placeholder.style.display = "none";
        });

        // Remove dotted borders and backgrounds for capture
        const placeholders = pageElement.querySelectorAll(".photo-placeholder");
        placeholders.forEach((placeholder) => {
          placeholder.style.border = "none";
          placeholder.style.backgroundColor = "transparent";
        });

        // Hide edit overlays and delete buttons for capture
        const editOverlays = pageElement.querySelectorAll(
          ".edit-overlay, .page-delete-btn"
        );
        editOverlays.forEach((overlay) => {
          overlay.style.display = "none";
        });

        // Wait for images to load
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Capture the page
        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        });

        // Add page to PDF (except first page)
        if (i > 0) {
          pdf.addPage();
        }

        // Add the image to the PDF
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
      }

      // Clean up the temporary container
      document.body.removeChild(tempContainer);

      // Save the PDF
      pdf.save("photo-layout.pdf");

      // Restore the original page
      this.sessionManager.sessionData.currentPage = currentPageIndex;
      this.navigatePage(0);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  }

  async showPrintPreview() {
    console.log("=== Starting Print Preview ===");

    // Create a new PrintManager instance if it doesn't exist
    if (!this.printManager) {
      console.log("Creating new PrintManager instance");
      this.printManager = new PrintManager();
    } else {
      console.log("Using existing PrintManager instance");
    }

    try {
      console.log("Attempting to show print dialog");
      // Create and show the print dialog
      const result = await this.printManager.showPrintDialog();
      console.log("Print dialog result:", result);
    } catch (error) {
      console.error("Error showing print dialog:", error);
    }
    console.log("=== Print Preview Complete ===");
  }

  // Enhanced image handling with editing features
  setupImageEditor(container) {
    const editorModal = document.getElementById("imageEditorModal");
    const preview = document.getElementById("imageEditorPreview");
    const img = container.querySelector("img");
    const placeholder = container.closest(".photo-placeholder");
    const cardId = placeholder.id;
    const pageNumber = this.sessionManager.sessionData.currentPage + 1;

    // Get current settings from session state
    const card = this.sessionManager.getCard(pageNumber, cardId);
    if (!card) return; // Safety check

    // Use card's size directly
    const previewWidth = card.size.width;
    const previewHeight = card.size.height;

    const editState = {
      zoom: card.imageSettings.zoom || 100,
      rotation: card.imageSettings.rotation || 0,
      translateX: card.imageSettings.translateX || 0,
      translateY: card.imageSettings.translateY || 0,
      fit: card.imageSettings.fit || "contain",
      width: card.size.width || "100%",
      height: card.size.height || "100%",
      objectFit: card.imageSettings.objectFit || "contain",
    };

    const history = [];
    let historyIndex = -1;

    preview.width = previewWidth;
    preview.height = previewHeight;

    preview.innerHTML = "";
    const previewContainer = document.createElement("div");
    previewContainer.className = "image-container";
    previewContainer.style.width = `${card.size.width}mm`;
    previewContainer.style.height = `${card.size.height}mm`;
    previewContainer.style.position = "relative";
    previewContainer.style.overflow = "hidden";

    // Clone and setup image
    const imgClone = img.cloneNode(true);
    imgClone.style.position = "absolute";
    imgClone.style.left = "50%";
    imgClone.style.top = "50%";

    // Set initial image dimensions based on container and image aspect ratios
    const containerAspect = card.size.width / card.size.height;
    const imageAspect = card.image.originalWidth / card.image.originalHeight;

    if (containerAspect > imageAspect) {
      imgClone.style.width = "auto";
      imgClone.style.height = "100%";
    } else {
      imgClone.style.width = "100%";
      imgClone.style.height = "auto";
    }

    previewContainer.appendChild(imgClone);
    preview.appendChild(previewContainer);

    // Initialize preview with current settings
    const updatePreview = () => {
      const transform = [];
      transform.push("translate(-50%, -50%)"); // Center the image

      if (editState.translateX || editState.translateY) {
        transform.push(
          `translate(${editState.translateX}px, ${editState.translateY}px)`
        );
      }

      if (editState.rotation) {
        transform.push(`rotate(${editState.rotation}deg)`);
      }

      if (editState.zoom) {
        transform.push(`scale(${editState.zoom / 100})`);
      }

      imgClone.style.transform = transform.join(" ");
      imgClone.style.objectFit = editState.objectFit;
      imgClone.style.width = editState.width;
      imgClone.style.height = editState.height;
    };

    const saveState = () => {
      history.splice(historyIndex + 1);
      history.push({ ...editState });
      historyIndex++;

      // Save to session state
      this.sessionManager.updateCardImageSettings(pageNumber, cardId, {
        ...editState,
      });
      this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
    };

    // Initialize controls with current values
    const zoomInput = document.getElementById("imageZoom");
    const rotationInput = document.getElementById("imageRotation");
    zoomInput.value = editState.zoom;
    rotationInput.value = editState.rotation;

    // Save initial state
    saveState();

    // Zoom handler
    zoomInput.oninput = () => {
      editState.zoom = parseInt(zoomInput.value);
      updatePreview();
    };
    zoomInput.onchange = () => {
      editState.zoom = parseInt(zoomInput.value);
      saveState();
    };

    // Rotation handler
    rotationInput.oninput = () => {
      editState.rotation = parseInt(rotationInput.value);
      updatePreview();
    };
    rotationInput.onchange = () => {
      editState.rotation = parseInt(rotationInput.value);
      saveState();
    };

    // Fit Image button
    document.getElementById("fitImage").onclick = () => {
      Object.assign(editState, {
        zoom: 100,
        translateX: 0,
        translateY: 0,
        fit: "contain",
        objectFit: "contain",
        width: "100%",
        height: "100%",
      });

      zoomInput.value = editState.zoom;
      rotationInput.value = editState.rotation;

      updatePreview();
      saveState();
    };

    // Fill Image button
    document.getElementById("fillImage").onclick = () => {
      Object.assign(editState, {
        zoom: 100,
        translateX: 0,
        translateY: 0,
        fit: "fill",
        objectFit: "fill",
        width: "100%",
        height: "100%",
      });

      zoomInput.value = editState.zoom;
      rotationInput.value = editState.rotation;

      updatePreview();
      saveState();
    };

    document.getElementById("rotateLeft").onclick = () => {
      editState.rotation = (editState.rotation - 90 + 360) % 360;
      rotationInput.value = editState.rotation;
      updatePreview();
      saveState();
    };

    document.getElementById("rotateRight").onclick = () => {
      editState.rotation = (editState.rotation + 90) % 360;
      rotationInput.value = editState.rotation;
      updatePreview();
      saveState();
    };

    // Undo handler
    document.getElementById("undoEdit").onclick = () => {
      if (historyIndex > 0) {
        historyIndex--;
        Object.assign(editState, history[historyIndex]);
        zoomInput.value = editState.zoom;
        rotationInput.value = editState.rotation;
        updatePreview();

        // Update session state
        this.sessionManager.updateCardImageSettings(pageNumber, cardId, {
          ...editState,
        });
        this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
      }
    };

    // Redo handler
    document.getElementById("redoEdit").onclick = () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        Object.assign(editState, history[historyIndex]);
        zoomInput.value = editState.zoom;
        rotationInput.value = editState.rotation;
        updatePreview();

        // Update session state
        this.sessionManager.updateCardImageSettings(pageNumber, cardId, {
          ...editState,
        });
        this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
      }
    };

    // Apply changes handler
    document.getElementById("applyChanges").onclick = () => {
      // Update the original image with current settings
      const transform = [];
      transform.push("translate(-50%, -50%)");

      if (editState.translateX || editState.translateY) {
        transform.push(
          `translate(${editState.translateX}px, ${editState.translateY}px}`
        );
      }

      if (editState.rotation) {
        transform.push(`rotate(${editState.rotation}deg)`);
      }

      if (editState.zoom) {
        transform.push(`scale(${editState.zoom / 100})`);
      }

      // Update the original image
      img.style.transform = transform.join(" ");
      img.style.objectFit = editState.objectFit;
      img.style.width = editState.width;
      img.style.height = editState.height;

      // Create complete image settings object with latest editState
      const completeImageSettings = {
        ...editState,
        containerWidth: card.size.width,
        containerHeight: card.size.height,
        originalWidth: card.image.originalWidth,
        originalHeight: card.image.originalHeight,
      };

      // Save final state to session
      this.sessionManager.updateCardImageSettings(
        pageNumber,
        cardId,
        completeImageSettings
      );
      console.log("After editing image settings - Card state:", {
        pageNumber,
        cardId,
        card: this.sessionManager.getCard(pageNumber, cardId),
        editState: completeImageSettings,
        originalEditState: editState,
      });
      this.sessionManager.saveState("Edit Image");

      // Update layout state
      this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);

      // Close modal
      editorModal.style.display = "none";
    };

    // Cancel changes handler
    document.getElementById("cancelChanges").onclick = () => {
      // Restore original settings
      Object.assign(editState, card.imageSettings);

      // Update the original image back to its previous state
      img.style.transform = `translate(-50%, -50%) 
                translate(${card.imageSettings.translateX}px, ${
        card.imageSettings.translateY
      }px)
                rotate(${card.imageSettings.rotation}deg)
                scale(${card.imageSettings.zoom / 100})`;
      img.style.objectFit = card.imageSettings.objectFit;
      img.style.width = card.imageSettings.width;
      img.style.height = card.imageSettings.height;

      // Close modal
      editorModal.style.display = "none";
    };

    // Initialize preview
    updatePreview();
  }

  closeModal() {
    if (this.modal) {
      this.modal.style.display = "none";
      // Alternative approach
      this.modal.classList.remove("show");
      document.body.classList.remove("modal-open");
    }
  }

  createPhotoPlaceholders(size) {
    // Clear existing placeholders
    this.pageContainer.innerHTML = "";

    let [width, height] = size.split("x").map((n) => parseInt(n));

    // Define page dimensions and spacing
    const PAGE_WIDTH = 210; // A4 width in mm
    const PAGE_HEIGHT = 297; // A4 height in mm
    const MARGIN = 5; // 5mm margin on all sides
    const SPACING = 10; // 10mm spacing between cards

    // Calculate how many cards can fit
    const availableWidth = PAGE_WIDTH - 2 * MARGIN;
    const availableHeight = PAGE_HEIGHT - 2 * MARGIN;

    const cols = Math.floor((availableWidth + SPACING) / (width + SPACING));
    const rows = Math.floor((availableHeight + SPACING) / (height + SPACING));

    // Validate if cards fit on page
    if (cols <= 0 || rows <= 0) {
      alert("Selected size is too large for A4 page");
      return;
    }

    // Create grid of placeholders
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = MARGIN + col * (width + SPACING);
        const y = MARGIN + row * (height + SPACING);

        const placeholder = document.createElement("div");
        placeholder.className = "photo-placeholder";

        Object.assign(placeholder.style, {
          width: `${width}mm`,
          height: `${height}mm`,
          left: `${x}mm`,
          top: `${y}mm`,
          position: "absolute",
        });

        this.pageContainer.appendChild(placeholder);
        this.setupDropZone(placeholder);
      }
    }

    // Update layout state after creating placeholders
    this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
  }

  setupDropZone(placeholder, cardId) {
    let dragCounter = 0;

    placeholder.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (dragCounter === 1) {
        placeholder.classList.add("dragover");
      }
    });

    placeholder.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    placeholder.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        placeholder.classList.remove("dragover");
      }
    });

    placeholder.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      placeholder.classList.remove("dragover");

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        this.handleImageFile(file, placeholder, cardId);
      }
    });

    // Add click handler for file browsing
    placeholder.addEventListener("click", () => {
      // Only trigger file browse if placeholder is empty
      if (!placeholder.querySelector("img")) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.display = "none";

        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file && file.type.startsWith("image/")) {
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
          originalHeight: img.height,
        };

        // Get the card to access its size
        const pageNumber = this.sessionManager.sessionData.currentPage + 1;
        const card = this.sessionManager.getCard(pageNumber, cardId);

        // Create complete initial image settings
        const initialImageSettings = {
          width: "100%",
          height: "100%",
          objectFit: "contain",
          fit: "contain",
          rotation: 0,
          zoom: 100,
          translateX: 0,
          translateY: 0,
          containerWidth: card.size.width,
          containerHeight: card.size.height,
          originalWidth: img.width,
          originalHeight: img.height,
        };

        // Update session and layout state
        this.sessionManager.setCardImage(pageNumber, cardId, imageData);
        this.sessionManager.updateCardImageSettings(
          pageNumber,
          cardId,
          initialImageSettings
        );

        console.log("After adding image - Card state:", {
          pageNumber,
          cardId,
          card: this.sessionManager.getCard(pageNumber, cardId),
          imageSettings: initialImageSettings,
        });

        this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);

        // Update display
        this.updateCardDisplay(placeholder, imageData);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  addEditOverlay(placeholder, cardId) {
    // Remove any existing overlay first
    const existingOverlay = placeholder.querySelector(".edit-overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const editOverlay = document.createElement("div");
    editOverlay.className = "edit-overlay";

    // Create delete button
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.innerHTML = "×";
    deleteButton.onclick = (e) => {
      e.stopPropagation();
      this.deleteImage(placeholder, cardId);
    };

    // Create edit button
    const editButton = document.createElement("button");
    editButton.className = "edit-btn";
    editButton.innerHTML = "✎";
    editButton.onclick = (e) => {
      console.log("Edit button clicked");
      e.stopPropagation();
      const imageContainer = placeholder.querySelector(".image-container");
      console.log("Image container found:", imageContainer);
      if (imageContainer) {
        document.getElementById("imageEditorModal").style.display = "block";
        this.setupImageEditor(imageContainer);
        console.log("Image editor setup complete");
      }
    };

    // Add buttons to overlay
    editOverlay.appendChild(editButton);
    editOverlay.appendChild(deleteButton);
    console.log("Edit overlay created");
    editOverlay.onclick = (e) => e.stopPropagation();

    placeholder.appendChild(editOverlay);
    console.log("Edit overlay added to placeholder");
  }

  deleteImage(placeholder, cardId) {
    const confirmed = confirm("Are you sure you want to delete this image?");
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
          fit: "contain",
        };

        // Save the state
        this.sessionManager.saveState("Delete Image");

        // Clear the placeholder
        placeholder.innerHTML = "";

        // Reinitialize the drop zone
        this.setupDropZone(placeholder, cardId);
      }
    }

    // Update layout state after deletion
    this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
  }

  resetProject() {
    const confirmed = confirm(
      "Are you sure you want to reset the project? This will delete all pages and cannot be undone."
    );
    if (confirmed) {
      // Reset session data
      this.sessionManager.sessionData = {
        pages: [],
        currentPage: 0,
      };

      // Clear history
      this.sessionManager.history = [];
      this.sessionManager.currentHistoryIndex = -1;

      // Create initial page
      this.addNewPage();

      // Update UI
      this.updatePageIndicator();

      // Save state
      this.sessionManager.saveState("Reset Project");
    }

    // Update layout state after reset
    this.layoutRenderer.setLayoutState(this.sessionManager.sessionData);
  }
}

// Initialize the editor when the page loads
window.addEventListener("DOMContentLoaded", () => {
  new PhotoLayoutEditor();
});
