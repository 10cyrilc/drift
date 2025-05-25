// Common functionality for all pages

// Shared WebSocket connection
let commonWs = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Initialize WebSocket connection
function connectWebSocket(onMessageCallback) {
  // If already connected, don't reconnect
  if (commonWs && commonWs.readyState === WebSocket.OPEN) {
    console.log("WebSocket already connected");
    return;
  }

  console.log("Connecting to WebSocket...");
  commonWs = new WebSocket("ws://" + window.location.host + "/ws");

  commonWs.onopen = function () {
    console.log("WebSocket connected successfully");
    reconnectAttempts = 0;
    const statusEl = document.getElementById("server-status");
    if (statusEl) {
      statusEl.textContent = "Server Status: Connected";
      statusEl.classList.add("connected");
      statusEl.classList.remove("disconnected");
    }
  };

  commonWs.onmessage = function (event) {
    console.log(
      "WebSocket message received:",
      event.data.substring(0, 100) + "..."
    );
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
      console.error("Error processing WebSocket message:", error);
    }
  };

  commonWs.onclose = function () {
    console.log("WebSocket connection closed");
    const statusEl = document.getElementById("server-status");
    if (statusEl) {
      statusEl.textContent = "Server Status: Disconnected";
      statusEl.classList.add("disconnected");
      statusEl.classList.remove("connected");
    }

    // Try to reconnect
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`
      );
      setTimeout(() => connectWebSocket(onMessageCallback), 5000);
    } else {
      console.log("Max reconnect attempts reached");
    }
  };

  commonWs.onerror = function (error) {
    console.error("WebSocket error:", error);
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
    element.textContent = element.getAttribute("data-original-text") || "";
  }
}

// Update status from server
function updateStatus() {
  showLoading("server-status");
  showLoading("localhost-url");

  fetch("/status")
    .then((response) => response.json())
    .then((data) => {
      const localhostEl = document.getElementById("localhost-url");
      if (localhostEl) {
        localhostEl.textContent = `Localhost URL: ${data.localhostURL}`;
        hideLoading("localhost-url");
      }

      const serverStatus = data.serverStatus;
      const statusEl = document.getElementById("server-status");
      if (statusEl) {
        statusEl.textContent = `Server Status: ${serverStatus}`;
        hideLoading("server-status");
        if (serverStatus === "Active") {
          statusEl.classList.add("connected");
          statusEl.classList.remove("disconnected");
        } else {
          statusEl.classList.add("disconnected");
          statusEl.classList.remove("connected");
        }
      }

      const zrokElement = document.getElementById("zrok-url");
      if (zrokElement) {
        if (data.zrokURL && data.zrokURL.includes("http")) {
          zrokElement.innerHTML = `Public URL: <a href="${data.zrokURL}" target="_blank">${data.zrokURL}</a>`;
          zrokElement.classList.add("has-url");
        } else {
          zrokElement.textContent = `Public URL: ${
            data.zrokURL || "Not available"
          }`;
          zrokElement.classList.remove("has-url");
        }
      }
    })
    .catch((error) => {
      console.error("Error fetching status:", error);
      hideLoading("server-status");
      hideLoading("localhost-url");
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
    serverStatusEl.textContent = "Server Status: Connecting...";
    serverStatusEl.classList.remove("connected", "disconnected");
  }

  if (localhostUrlEl) {
    localhostUrlEl.textContent = "Localhost URL: Loading...";
  }

  if (zrokUrlEl) {
    zrokUrlEl.textContent = "Public URL: Loading...";
    zrokUrlEl.classList.remove("has-url");
  }

  // Update status immediately and then periodically
  updateStatus();
  setInterval(updateStatus, 5000);
}

// Initialize common elements when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("Common.js: DOM loaded");

  // Initialize top bar if it exists
  if (document.querySelector(".top-bar")) {
    console.log("Common.js: Initializing top bar");
    initializeTopBar();
  }

  // Only run these functions if we're on a page with the sidebar
  if (document.getElementById("sidebar")) {
    console.log("Common.js: Setting up sidebar");
    setupSidebar();
  }

  // Connect WebSocket on all pages
  connectWebSocket();
});
