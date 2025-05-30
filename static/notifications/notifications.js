// Notifications page functionality
let selectedNotificationId = null;

// Initialize the notifications page
function initNotificationsPage() {
  loadNotifications();
  setupSearch();
  setupFilters();
  setupClearButton();
  setupExportButton();
}

// Load notifications from storage
function loadNotifications() {
  const allNotifications = getNotifications();

  // Sort by timestamp (newest first)
  allNotifications.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Render notifications list
  renderNotificationsList(allNotifications);

  // Select first notification if available
  if (allNotifications.length > 0) {
    const firstItem = document.querySelector("#notifications-list li");
    if (firstItem) {
      firstItem.click();
    }
  }

  // Toggle empty state
  toggleEmptyState();
}

// Render notifications list
function renderNotificationsList(notifications) {
  const listElement = document.getElementById("notifications-list");
  if (!listElement) return;

  // Clear existing list
  listElement.innerHTML = "";

  // Add each notification to the list
  notifications.forEach((notification) => {
    const listItem = document.createElement("li");
    listItem.dataset.id = notification.id;
    listItem.dataset.type = notification.type;

    const date = new Date(notification.timestamp);
    const formattedTime = formatTime(date);

    listItem.innerHTML = `
      <div class="notification-list-item">
        <div class="notification-list-header">
          <span class="notification-type ${notification.type}">${notification.type}</span>
          <span class="notification-time">${formattedTime}</span>
        </div>
        <div class="notification-list-content">${notification.message}</div>
      </div>
    `;

    listItem.addEventListener("click", () => {
      document.querySelectorAll("#notifications-list li").forEach((item) => {
        item.classList.remove("selected");
      });
      listItem.classList.add("selected");
      selectedNotificationId = notification.id;
      displayNotificationDetails(notification);
    });

    listElement.appendChild(listItem);
  });
}

// Format time for display
function formatTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  } else if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleString();
  }
}

// Display notification details
function displayNotificationDetails(notification) {
  const detailsContainer = document.getElementById("notification-detail");
  if (!detailsContainer) return;

  const date = new Date(notification.timestamp);
  const formattedDate = date.toLocaleString();

  detailsContainer.innerHTML = `
    <div class="notification-detail-header">
      <span class="notification-detail-type ${
        notification.type
      }">${notification.type.toUpperCase()}</span>
      <span class="notification-detail-time">${formattedDate}</span>
    </div>
    <div class="notification-detail-message">${notification.message}</div>
  `;

  // Add delete button functionality
  const deleteBtn = document.getElementById("delete-notification");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this notification?")) {
        removeNotification(notification.id);
        loadNotifications();
      }
    });
  }
}

// Toggle empty state
function toggleEmptyState() {
  const listElement = document.getElementById("notifications-list");
  const emptyState = document.getElementById("empty-notifications");

  if (!listElement || !emptyState) return;

  if (listElement.children.length > 0) {
    emptyState.style.display = "none";
  } else {
    emptyState.style.display = "flex";
  }
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById("notification-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const allNotifications = getNotifications();

    // Filter notifications by search term
    const filteredNotifications = allNotifications.filter((notification) => {
      return notification.message.toLowerCase().includes(searchTerm);
    });

    // Apply type filter if active
    const activeTypeFilter = document.querySelector(".filter-btn.active");
    if (activeTypeFilter && activeTypeFilter.dataset.type !== "all") {
      const typeFilter = activeTypeFilter.dataset.type;
      const typeFilteredNotifications = filteredNotifications.filter(
        (notification) => {
          return notification.type === typeFilter;
        }
      );

      renderNotificationsList(typeFilteredNotifications);
    } else {
      renderNotificationsList(filteredNotifications);
    }
  });
}

// Setup notification type filters
function setupFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  if (!filterButtons.length) return;

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      filterButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked button
      button.classList.add("active");

      const filterType = button.dataset.type;
      const searchTerm = document
        .getElementById("notification-search")
        .value.toLowerCase();
      const allNotifications = getNotifications();

      // Apply search filter first
      const searchFiltered = searchTerm
        ? allNotifications.filter((notification) =>
            notification.message.toLowerCase().includes(searchTerm)
          )
        : allNotifications;

      // Then apply type filter
      if (filterType === "all") {
        renderNotificationsList(searchFiltered);
      } else {
        const typeFiltered = searchFiltered.filter(
          (notification) => notification.type === filterType
        );
        renderNotificationsList(typeFiltered);
      }
    });
  });
}

// Setup clear all button
function setupClearButton() {
  const clearButton = document.getElementById("clear-all-notifications");
  if (!clearButton) return;

  clearButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all notifications?")) {
      // Clear notifications from storage
      clearAllNotifications();

      // Update UI
      document.getElementById("notifications-list").innerHTML = "";
      document.getElementById("notification-detail").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👈</div>
          <div class="empty-text">Select a notification to view details</div>
        </div>
      `;

      // Show empty state
      toggleEmptyState();

      // Update badge count
      updateNotificationsBadge();
    }
  });
}

// Setup export button
function setupExportButton() {
  const exportButton = document.getElementById("export-notifications");
  if (!exportButton) return;

  exportButton.addEventListener("click", () => {
    const allNotifications = getNotifications();

    if (allNotifications.length === 0) {
      alert("No notifications to export");
      return;
    }

    // Create export data
    const exportData = {
      timestamp: new Date().toISOString(),
      notifications: allNotifications,
    };

    // Convert to JSON
    const jsonData = JSON.stringify(exportData, null, 2);

    // Create download link
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notifications-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });
}

// Update relative timestamps periodically
function updateRelativeTimestamps() {
  const timeElements = document.querySelectorAll(".notification-time");

  timeElements.forEach((element) => {
    const listItem = element.closest("li");
    if (!listItem) return;

    const notificationId = listItem.dataset.id;
    const notification = getNotificationById(notificationId);

    if (notification) {
      const date = new Date(notification.timestamp);
      element.textContent = formatTime(date);
    }
  });
}

// Get a notification by ID
function getNotificationById(id) {
  const allNotifications = getNotifications();
  return allNotifications.find((notification) => notification.id === id);
}

// Initialize page when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initNotificationsPage();

  // Update timestamps every minute
  setInterval(updateRelativeTimestamps, 60000);
});
