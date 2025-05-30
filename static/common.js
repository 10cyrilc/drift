// Common functionality for all pages

// Shared WebSocket connection
let commonWs = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Notification System
let notifications = [];
const NOTIFICATION_STORAGE_KEY = "appNotifications";

// Initialize notification container
function initNotificationSystem() {
  // Create container if it doesn't exist
  if (!document.querySelector(".notification-container")) {
    const container = document.createElement("div");
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  // Load saved notifications from session storage
  loadNotifications();
}

// Show a notification
function showNotification(message, type = "info", duration = 5000) {
  const container = document.querySelector(".notification-container");
  if (!container) return;

  const id = Date.now().toString();
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.dataset.id = id;
  notification.innerHTML = `
    <div class="notification-content">${message}</div>
    <button class="notification-close">&times;</button>
  `;

  // Add to DOM
  container.appendChild(notification);

  // Add close button functionality
  const closeBtn = notification.querySelector(".notification-close");
  closeBtn.addEventListener("click", () => {
    removeNotification(id);
  });

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }

  // Store notification in memory and session storage
  const notificationData = {
    id,
    message,
    type,
    timestamp: new Date().toISOString(),
  };

  notifications.push(notificationData);
  saveNotifications();

  return id;
}

// Show success notification
function showSuccess(message, duration = 5000) {
  return showNotification(message, "success", duration);
}

// Show error notification
function showError(message, duration = 7000) {
  return showNotification(message, "error", duration);
}

// Show warning notification
function showWarning(message, duration = 6000) {
  return showNotification(message, "warning", duration);
}

// Show info notification
function showInfo(message, duration = 5000) {
  return showNotification(message, "info", duration);
}

// Remove a notification
function removeNotification(id) {
  const notification = document.querySelector(`.notification[data-id="${id}"]`);
  if (notification) {
    // Animate out
    notification.style.animation = "slide-out 0.3s ease forwards";

    // Remove from DOM after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  // Remove from storage
  notifications = notifications.filter((n) => n.id !== id);
  saveNotifications();

  // Update badge
  updateNotificationsBadge();
}

// Clear all notifications
function clearAllNotifications() {
  const container = document.querySelector(".notification-container");
  if (container) {
    // Remove all from DOM
    container.innerHTML = "";
  }

  // Clear storage
  notifications = [];
  saveNotifications();

  // Update badge
  updateNotificationsBadge();
}

// Save notifications to session storage
function saveNotifications() {
  // Keep only the last 50 notifications to prevent storage issues
  const trimmedNotifications = notifications.slice(-50);
  sessionStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    JSON.stringify(trimmedNotifications)
  );
}

// Load notifications from session storage
function loadNotifications() {
  try {
    const stored = sessionStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (stored) {
      notifications = JSON.parse(stored);
    }
  } catch (error) {
    showError("Error loading notifications from session storage:", error);
    notifications = [];
  }
}

// Get all stored notifications
function getNotifications() {
  try {
    const stored = sessionStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading notifications from session storage:", error);
  }
  return [];
}

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
  showLoading("server-status");
  showLoading("localhost-url");
  showLoading("zrok-url");

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

      const zrokEl = document.getElementById("zrok-url");
      if (zrokEl) {
        if (data.zrokURL && data.zrokURL.startsWith("http")) {
          zrokEl.innerHTML = `Public URL: <a href="${data.zrokURL}" target="_blank">${data.zrokURL}</a>`;
          zrokEl.classList.add("has-url");
        } else {
          zrokEl.textContent = `Public URL: ${data.zrokURL || "Not available"}`;
          zrokEl.classList.remove("has-url");
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

// Remove the createNotificationsPanel and toggleNotificationsPanel functions
// since we're using a dedicated page now

// Update notifications badge count
function updateNotificationsBadge() {
  const badges = document.querySelectorAll(".notifications-badge");
  if (!badges.length) return;

  const count = notifications.length;

  badges.forEach((badge) => {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = count > 0 ? "flex" : "none";
  });
}

// Initialize the notification system
document.addEventListener("DOMContentLoaded", () => {
  console.log("Common.js: Initializing notification system");
  initNotificationSystem();

  // Update badge count
  updateNotificationsBadge();

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
