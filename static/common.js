// Common functionality for all pages

// Shared WebSocket connection
let commonWs = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Function to get appropriate icon for HTTP method
function getMethodIcon(method) {
  const icons = {
    GET: "description",
    POST: "add_circle",
    PUT: "sync",
    DELETE: "delete",
    PATCH: "edit",
  };
  return icons[method] || "http";
}

// Example of how to create a method element
function createMethodElement(method) {
  const methodEl = document.createElement("span");
  methodEl.className = `method-${method.toLowerCase()}`;
  methodEl.innerHTML = `
    <span class="material-icons method-icon">${getMethodIcon(method)}</span>
    ${method}
  `;
  return methodEl;
}

// Initialize WebSocket connection
function connectWebSocket(onMessageCallback) {
  // If already connected, don't reconnect
  if (commonWs && commonWs.readyState === WebSocket.OPEN) {
    showInfo("WebSocket already connected");
    return;
  }

  commonWs = new WebSocket("ws://" + window.location.host + "/ws");

  commonWs.onopen = function () {
    reconnectAttempts = 0;
    // Don't update server status here - let the status API handle it
  };

  commonWs.onmessage = function (event) {
    try {
      const log = JSON.parse(event.data);

      // Store in sessionStorage for persistence
      const savedData = sessionStorage.getItem("requestData") || "[]";
      const requests = JSON.parse(savedData);
      requests.push(log);
      sessionStorage.setItem("requestData", JSON.stringify(requests));

      // Store timestamps for graph
      const savedTimestamps =
        sessionStorage.getItem("requestTimestamps") || "[]";
      const timestamps = JSON.parse(savedTimestamps);
      timestamps.push(new Date(log.request.timestamp).getTime());
      sessionStorage.setItem("requestTimestamps", JSON.stringify(timestamps));

      // Call the page-specific callback if provided
      if (onMessageCallback && typeof onMessageCallback === "function") {
        onMessageCallback(log);
      }
    } catch (error) {
      showError("Error processing WebSocket message:", error);
    }
  };

  commonWs.onclose = function () {
    const statusEl = document.getElementById("server-status");
    if (statusEl) {
      statusEl.textContent = "Server Status: Disconnected";
      statusEl.classList.add("disconnected");
      statusEl.classList.remove("connected");
    }

    // Try to reconnect
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(() => connectWebSocket(onMessageCallback), 5000);
    } else {
      showError("Max reconnect attempts reached");
    }
  };

  commonWs.onerror = function (error) {
    showError(
      `WebSocket connection error. Some features may not work correctly. ${error}`
    );

    const statusEl = document.getElementById("server-status");
    if (statusEl) {
      statusEl.textContent = "Server Status: Error";
      statusEl.classList.add("disconnected");
      statusEl.classList.remove("connected");
    }
  };
}

// Add loading indicator function
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add("loading");
    element.setAttribute("data-original-text", element.textContent);
    element.textContent = "Loading...";
  }
}

function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element && element.classList.contains("loading")) {
    element.classList.remove("loading");
    // Don't restore original text as we've already set the new text
  }
}

// Update status from server
function updateStatus() {
  fetch("/status")
    .then((response) => response.json())
    .then((data) => {
      const localhostEl = document.getElementById("localhost-url");
      if (localhostEl && data.localhostURL) {
        const currentURL = localhostEl.textContent
          ?.replace("Localhost URL: ", "")
          .trim();

        if (currentURL !== data.localhostURL) {
          localhostEl.textContent = `Localhost URL: ${data.localhostURL}`;
        }

        hideLoading("localhost-url");
      }

      const serverStatus = data.serverStatus;
      const statusEl = document.getElementById("server-status");
      if (statusEl && serverStatus) {
        const currentStatus = statusEl.textContent
          ?.replace("Server Status: ", "")
          .trim();

        if (currentStatus !== serverStatus) {
          statusEl.textContent = `Server Status: ${serverStatus}`;

          if (serverStatus === "Active") {
            statusEl.classList.add("connected");
            statusEl.classList.remove("disconnected");
          } else {
            statusEl.classList.add("disconnected");
            statusEl.classList.remove("connected");
          }
        }

        hideLoading("server-status");
      }

      const zrokEl = document.getElementById("zrok-url");
      if (zrokEl) {
        const currentContent = zrokEl.textContent
          ?.replace("Public URL: ", "")
          .trim();
        const newURL = data.zrokURL?.trim();

        if (newURL && newURL.startsWith("http")) {
          if (
            !zrokEl.classList.contains("has-url") ||
            currentContent !== newURL
          ) {
            zrokEl.innerHTML = `Public URL: <a href="${newURL}" target="_blank">${newURL}</a>`;
            zrokEl.classList.add("has-url");
          }
        } else {
          const fallbackText = `Public URL: ${newURL || "Not available"}`;
          if (
            zrokEl.textContent !== fallbackText ||
            zrokEl.classList.contains("has-url")
          ) {
            zrokEl.textContent = fallbackText;
            zrokEl.classList.remove("has-url");
          }
        }
        hideLoading("zrok-url");
      }
    })
    .catch((error) => {
      showError("Error fetching status:", error);
      showError("Failed to fetch server status: " + error.message);
      hideLoading("server-status");
      hideLoading("localhost-url");
      hideLoading("zrok-url");
    });
}

// Setup sidebar functionality
function setupSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("main-content");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const sidebarItems = document.querySelectorAll(".sidebar-item");

  if (!sidebar || !mainContent || !sidebarToggle || !sidebarOverlay) return;

  // Check if sidebar state is saved in localStorage
  const sidebarExpanded = localStorage.getItem("sidebarExpanded") === "true";
  if (sidebarExpanded) {
    sidebar.classList.add("expanded");
    mainContent.classList.add("sidebar-expanded");
  }

  // Setup tooltips for sidebar items
  sidebarItems.forEach((item) => {
    const tooltip = item.getAttribute("data-tooltip");
    if (tooltip) {
      item.addEventListener("mouseenter", () => {
        if (!sidebar.classList.contains("expanded")) {
          const tooltipEl = document.createElement("div");
          tooltipEl.className = "sidebar-tooltip";
          tooltipEl.textContent = tooltip;

          // Position the tooltip
          const rect = item.getBoundingClientRect();
          tooltipEl.style.top = `${rect.top + rect.height / 2}px`;
          tooltipEl.style.left = `${rect.right + 10}px`;

          document.body.appendChild(tooltipEl);
        }
      });

      item.addEventListener("mouseleave", () => {
        const tooltips = document.querySelectorAll(".sidebar-tooltip");
        tooltips.forEach((el) => el.remove());
      });
    }
  });

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("expanded");
    mainContent.classList.toggle("sidebar-expanded");

    // Save sidebar state to localStorage
    localStorage.setItem(
      "sidebarExpanded",
      sidebar.classList.contains("expanded")
    );

    // On mobile, show overlay when sidebar is expanded
    if (window.innerWidth <= 768) {
      sidebarOverlay.classList.toggle(
        "active",
        sidebar.classList.contains("expanded")
      );
    }

    // Remove any tooltips when expanding/collapsing
    const tooltips = document.querySelectorAll(".sidebar-tooltip");
    tooltips.forEach((el) => el.remove());
  });

  // Close sidebar when clicking on overlay (mobile only)
  sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("expanded");
    sidebarOverlay.classList.remove("active");
    localStorage.setItem("sidebarExpanded", "false");
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768) {
      sidebarOverlay.classList.toggle(
        "active",
        sidebar.classList.contains("expanded")
      );
    } else {
      sidebarOverlay.classList.remove("active");
    }
  });
}

// Initialize top bar elements
function initializeTopBar() {
  const serverStatusEl = document.getElementById("server-status");
  const localhostUrlEl = document.getElementById("localhost-url");
  const zrokUrlEl = document.getElementById("zrok-url");

  // Set initial values
  if (serverStatusEl) {
    serverStatusEl.textContent = "Server Status: Checking...";
    serverStatusEl.classList.remove("connected", "disconnected");
  }

  if (localhostUrlEl) {
    localhostUrlEl.textContent = "Localhost URL: Checking...";
  }

  if (zrokUrlEl) {
    zrokUrlEl.textContent = "Public URL: Checking...";
    zrokUrlEl.classList.remove("has-url");
  }

  // Update status immediately and then periodically
  updateStatus();
  setInterval(updateStatus, 5000);
}

document.addEventListener("DOMContentLoaded", () => {
  // Add to existing initialization
  if (document.querySelector(".top-bar")) {
    console.log("Common.js: Initializing top bar");
    initializeTopBar();
  }

  if (document.getElementById("sidebar")) {
    console.log("Common.js: Setting up sidebar");
    setupSidebar();
  }

  // Connect WebSocket on all pages
  connectWebSocket();
});
