// Dashboard-specific functionality

// Request cache and selected request tracking
const requestCache = {};
let selectedRequestId = null;

// Load saved requests from sessionStorage
function loadSavedRequests() {
  console.log("Dashboard: Loading saved requests");
  try {
    const savedData = sessionStorage.getItem("requestData");
    if (savedData) {
      const requests = JSON.parse(savedData);
      console.log(`Dashboard: Found ${requests.length} saved requests`);

      // Process each saved request
      requests.forEach((log) => {
        requestCache[log.request.id] = log;
        addRequestToUI(log);
      });

      // Select the first request if available
      if (requests.length > 0) {
        const firstRequestItem = document.querySelector("#requests li");
        if (firstRequestItem) {
          firstRequestItem.click();
        }
      }
    } else {
      console.log("Dashboard: No saved requests found");
    }

    toggleEmptyState();
  } catch (error) {
    console.error("Dashboard: Error loading saved requests:", error);
  }
}

// Handle WebSocket message
function handleWebSocketMessage(log) {
  console.log("Dashboard: Received WebSocket message:", log.request.id);

  // Store in cache
  requestCache[log.request.id] = log;

  // Add to UI
  addRequestToUI(log);

  toggleEmptyState();
}

// Toggle empty state message
function toggleEmptyState() {
  const requestsList = document.getElementById("requests");
  const emptyState = document.getElementById("empty-requests");

  if (!requestsList || !emptyState) return;

  if (requestsList.children.length > 0) {
    emptyState.style.display = "none";
  } else {
    emptyState.style.display = "flex";
  }
}

// Add request to UI
function addRequestToUI(log) {
  console.log("Dashboard: Adding request to UI:", log.request.id);
  const requestsList = document.getElementById("requests");
  if (!requestsList) return;

  const requestItem = document.createElement("li");
  requestItem.dataset.id = log.request.id;
  requestItem.dataset.method = log.request.method.toLowerCase();

  // Get status code class
  const statusCode = log.response.status_code;
  let statusClass = "unknown";
  if (statusCode >= 200 && statusCode < 300) statusClass = "2xx";
  else if (statusCode >= 300 && statusCode < 400) statusClass = "3xx";
  else if (statusCode >= 400 && statusCode < 500) statusClass = "4xx";
  else if (statusCode >= 500) statusClass = "5xx";

  // Format timestamp
  const timestamp = new Date(log.request.timestamp);
  const hours = timestamp.getHours().toString().padStart(2, "0");
  const minutes = timestamp.getMinutes().toString().padStart(2, "0");
  const seconds = timestamp.getSeconds().toString().padStart(2, "0");
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  // Get URL path
  let path;
  try {
    const url = new URL(log.request.url);
    path = url.pathname + url.search;
  } catch (e) {
    path = log.request.url;
  }

  requestItem.innerHTML = `
    <div class="request-list-content">
      <div class="request-path">${path}</div>
      <div class="request-time">${formattedTime}</div>
    </div>
    <span class="request-status status-${statusClass}">${statusCode}</span>
  `;

  requestItem.addEventListener("click", () => {
    document.querySelectorAll("#requests li").forEach((item) => {
      item.classList.remove("selected");
    });
    requestItem.classList.add("selected");
    selectedRequestId = log.request.id;
    displayRequestDetails(log);
  });

  // Add to the beginning of the list
  requestsList.insertBefore(requestItem, requestsList.firstChild);
}

// Display request details
function displayRequestDetails(log) {
  console.log("Dashboard: Displaying details for request:", log.request.id);
  const detailsContainer = document.getElementById("details");
  if (!detailsContainer) return;

  const request = log.request;
  const response = log.response;

  // Format headers
  let requestHeaders = "<em>No headers</em>";
  if (request.headers && Object.keys(request.headers).length > 0) {
    requestHeaders = "";
    for (const [key, value] of Object.entries(request.headers)) {
      requestHeaders += `<span class="header-name">${key}:</span> ${value}\n`;
    }
  }

  let responseHeaders = "<em>No headers</em>";
  if (response.headers && Object.keys(response.headers).length > 0) {
    responseHeaders = "";
    for (const [key, value] of Object.entries(response.headers)) {
      responseHeaders += `<span class="header-name">${key}:</span> ${value}\n`;
    }
  }

  // Format bodies
  let requestBody = "<em>No body</em>";
  if (request.body) {
    if (
      request.headers &&
      request.headers["Content-Type"] &&
      request.headers["Content-Type"].includes("application/json")
    ) {
      try {
        const jsonObj =
          typeof request.body === "string"
            ? JSON.parse(request.body)
            : request.body;
        requestBody = JSON.stringify(jsonObj, null, 2);
      } catch (e) {
        requestBody = request.body;
      }
    } else {
      requestBody =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
    }
  }

  let responseBody = "<em>No body</em>";
  if (response.body) {
    if (
      response.headers &&
      response.headers["Content-Type"] &&
      response.headers["Content-Type"].includes("application/json")
    ) {
      try {
        const jsonObj =
          typeof response.body === "string"
            ? JSON.parse(response.body)
            : response.body;
        responseBody = JSON.stringify(jsonObj, null, 2);
      } catch (e) {
        responseBody = response.body;
      }
    } else {
      responseBody =
        typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body);
    }
  }

  // Format timestamp
  const timestamp = new Date(request.timestamp);
  const formattedDate = timestamp.toLocaleDateString();
  const formattedTime = timestamp.toLocaleTimeString();

  // Calculate duration
  const duration = response.duration
    ? `${response.duration.toFixed(2)} ms`
    : "N/A";

  // Get status class
  let statusClass = "unknown";
  if (response.status_code >= 200 && response.status_code < 300)
    statusClass = "2xx";
  else if (response.status_code >= 300 && response.status_code < 400)
    statusClass = "3xx";
  else if (response.status_code >= 400 && response.status_code < 500)
    statusClass = "4xx";
  else if (response.status_code >= 500) statusClass = "5xx";

  detailsContainer.innerHTML = `
    <div class="details-section">
      <div class="section-title">Overview</div>
      <div class="section-content">
        <div class="details-item">
          <div class="details-label">Method</div>
          <div class="details-value method-${request.method.toLowerCase()}">${
    request.method
  }</div>
        </div>
        <div class="details-item">
          <div class="details-label">URL</div>
          <div class="details-value">${request.url}</div>
        </div>
        <div class="details-item">
          <div class="details-label">Status</div>
          <div class="details-value">
            <span class="status-code status-${statusClass}">${
    response.status_code
  }</span>
            ${response.status_text || ""}
          </div>
        </div>
        <div class="details-item">
          <div class="details-label">Time</div>
          <div class="details-value">${formattedDate} ${formattedTime}</div>
        </div>
        <div class="details-item">
          <div class="details-label">Duration</div>
          <div class="details-value">${duration}</div>
        </div>
        <div class="details-item">
          <div class="details-label">IP</div>
          <div class="details-value">${request.client_ip || "N/A"}</div>
        </div>
      </div>
    </div>

    <div class="details-section">
      <div class="section-title">Request Headers</div>
      <div class="section-content">
        <pre class="headers-content">${requestHeaders}</pre>
      </div>
    </div>

    <div class="details-section">
      <div class="section-title">Request Body</div>
      <div class="section-content">
        <pre class="body-content">${requestBody}</pre>
      </div>
    </div>

    <div class="details-section">
      <div class="section-title">Response Headers</div>
      <div class="section-content">
        <pre class="headers-content">${responseHeaders}</pre>
      </div>
    </div>

    <div class="details-section">
      <div class="section-title">Response Body</div>
      <div class="section-content">
        <pre class="body-content">${responseBody}</pre>
      </div>
    </div>
  `;
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById("request-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const requestItems = document.querySelectorAll("#requests li");

    requestItems.forEach((item) => {
      const requestId = item.dataset.id;
      const requestData = requestCache[requestId];

      if (!requestData) return;

      const method = requestData.request.method.toLowerCase();
      const url = requestData.request.url.toLowerCase();
      const status = requestData.response.status_code.toString();

      if (
        method.includes(searchTerm) ||
        url.includes(searchTerm) ||
        status.includes(searchTerm)
      ) {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    });
  });
}

// Setup method filters
function setupRequestFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  if (!filterButtons.length) return;

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update active state
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.remove("active");
      });
      btn.classList.add("active");

      // Apply filter
      const method = btn.dataset.method;
      const requestItems = document.querySelectorAll("#requests li");

      requestItems.forEach((item) => {
        if (method === "all") {
          item.style.display = "";
        } else {
          const itemMethod = item.getAttribute("data-method").toLowerCase();
          item.style.display =
            itemMethod === method.toLowerCase() ? "" : "none";
        }
      });
    });
  });
}

// Setup clear requests button
function setupClearRequests() {
  const clearBtn = document.getElementById("clear-requests");
  if (!clearBtn) return;

  clearBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all requests?")) {
      document.getElementById("requests").innerHTML = "";
      document.getElementById("details").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👈</div>
          <div class="empty-text">Select a request to view details</div>
        </div>
      `;

      // Clear cache and storage
      Object.keys(requestCache).forEach((key) => delete requestCache[key]);
      sessionStorage.removeItem("requestData");
      sessionStorage.removeItem("requestTimestamps");

      selectedRequestId = null;
      toggleEmptyState();
    }
  });
}

// Setup section toggles
function setupDetailToggles() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("section-title")) {
      const section = e.target.closest(".details-section");
      section.classList.toggle("collapsed");
    }
  });
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("Dashboard: DOM loaded, initializing dashboard");

  // Load saved requests
  loadSavedRequests();

  // Connect to WebSocket with our message handler
  connectWebSocket(handleWebSocketMessage);

  // Setup UI components
  setupSearch();
  setupRequestFilters();
  setupClearRequests();
  setupDetailToggles();

  console.log("Dashboard: Initialization complete");
});
