// Dashboard-specific functionality

// Request cache and selected request tracking
const requestCache = {};
let selectedRequestId = null;

function loadSavedRequests() {
  try {
    getAllRequests()
      .then((requests) => {
        if (requests && requests.length > 0) {
          // Process each saved request
          requests.forEach((log) => {
            requestCache[log.request.id] = log;
            addRequestToUI(log);
          });

          // Select the first request if available
          const firstRequestItem = document.querySelector("#requests li");
          if (firstRequestItem) {
            firstRequestItem.click();
          }
        }

        toggleEmptyState();
      })
      .catch((error) => {
        showError("Dashboard: Error loading saved requests:", error);
      });
  } catch (error) {
    console.error(error);
    showError("Dashboard: Error loading saved requests:", error);
  }
}

// Handle WebSocket message
function handleWebSocketMessage(log) {
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

// Format relative time (e.g., "2 minutes ago")
function formatRelativeTime(timestamp) {
  const now = new Date();
  const requestTime = new Date(timestamp);
  const diffMs = now - requestTime;

  // If more than 5 minutes, return the regular time format
  if (diffMs > 5 * 60 * 1000) {
    const hours = requestTime.getHours().toString().padStart(2, "0");
    const minutes = requestTime.getMinutes().toString().padStart(2, "0");
    const seconds = requestTime.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  // Otherwise, show relative time
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 5) {
    return "just now";
  } else if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  } else {
    const diffMinutes = Math.floor(diffSeconds / 60);
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }
}

// Add request to UI
function addRequestToUI(log) {
  const requestsList = document.getElementById("requests");
  if (!requestsList) return;

  const requestItem = document.createElement("li");
  requestItem.dataset.id = log.request.id;
  requestItem.dataset.method = log.request.method.toLowerCase();
  requestItem.dataset.timestamp = log.request.timestamp; // Store timestamp for updates

  // Get status code class
  const statusCode = log.response.status_code;
  let statusClass = "unknown";
  if (statusCode >= 200 && statusCode < 300) statusClass = "2xx";
  else if (statusCode >= 300 && statusCode < 400) statusClass = "3xx";
  else if (statusCode >= 400 && statusCode < 500) statusClass = "4xx";
  else if (statusCode >= 500) statusClass = "5xx";

  // Format timestamp
  const formattedTime = formatRelativeTime(log.request.timestamp);

  // Get URL path
  let path;
  try {
    const url = new URL(log.request.url);
    path = url.pathname + url.search;
  } catch (e) {
    path = log.request.url;
  }

  // Handle unknown method
  const method = log.request.method || "UNKNOWN";
  const methodClass = ["get", "post", "put", "delete", "patch"].includes(
    method.toLowerCase()
  )
    ? method.toLowerCase()
    : "unknown";

  requestItem.innerHTML = `
    <div class="request-list-content">
      <div class="request-path">
        <span class="method method-${methodClass}">${method}</span>
        ${path}
      </div>
      <div class="request-time" data-timestamp="${log.request.timestamp}">${formattedTime}</div>
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

// Format JSON with syntax highlighting
function formatJSON(json) {
  if (!json) return "<em>No body</em>";

  try {
    const obj = typeof json === "string" ? JSON.parse(json) : json;
    const formatted = JSON.stringify(obj, null, 2);

    // Apply syntax highlighting
    return formatted
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function (match) {
          let cls = "json-number";
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "json-key";
              match = match.replace(/"/, "").replace(/":/g, "");
            } else {
              cls = "json-string";
            }
          } else if (/true|false/.test(match)) {
            cls = "json-boolean";
          } else if (/null/.test(match)) {
            cls = "json-null";
          }
          return '<span class="' + cls + '">' + match + "</span>";
        }
      );
  } catch (e) {
    showError("Error formatting JSON:", e);
    return json;
  }
}

// Copy text to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

// Display request details
function displayRequestDetails(log) {
  const detailsContainer = document.getElementById("details");
  if (!detailsContainer) return;

  const request = log.request;
  const response = log.response;

  // Handle unknown method
  const method = request.method || "UNKNOWN";
  const methodClass = ["get", "post", "put", "delete", "patch"].includes(
    method.toLowerCase()
  )
    ? method.toLowerCase()
    : "unknown";

  // Format headers using the same structure as overview
  let requestHeadersContent =
    "<div class='details-row'><div class='details-value'><em>No headers</em></div></div>";
  if (request.headers && Object.keys(request.headers).length > 0) {
    requestHeadersContent = "";
    for (const [key, value] of Object.entries(request.headers)) {
      requestHeadersContent += `
        <div class="details-row">
          <div class="details-label">${key}</div>
          <div class="details-value">${value}</div>
        </div>
      `;
    }
  }

  let responseHeadersContent =
    "<div class='details-row'><div class='details-value'><em>No headers</em></div></div>";
  if (response.headers && Object.keys(response.headers).length > 0) {
    responseHeadersContent = "";
    for (const [key, value] of Object.entries(response.headers)) {
      responseHeadersContent += `
        <div class="details-row">
          <div class="details-label">${key}</div>
          <div class="details-value">${value}</div>
        </div>
      `;
    }
  }

  // Format bodies
  let rawRequestBody = "";
  let requestBody = "<em>No body</em>";
  if (request.body) {
    rawRequestBody =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body);

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
        requestBody = formatJSON(jsonObj);
      } catch (e) {
        requestBody = rawRequestBody;
      }
    } else {
      requestBody = rawRequestBody;
    }
  }

  let rawResponseBody = "";
  let responseBody = "<em>No body</em>";
  if (response.body) {
    rawResponseBody =
      typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body);

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
        responseBody = formatJSON(jsonObj);
      } catch (e) {
        responseBody = rawResponseBody;
      }
    } else {
      responseBody = rawResponseBody;
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
    <div class="details-actions">
      <button id="replay-request" class="action-btn">Replay Request</button>
      <button id="edit-and-replay" class="action-btn">Edit & Replay</button>
    </div>
    
    <div class="details-section">
      <div class="section-title">Overview</div>
      <div class="section-content">
        <div class="details-table">
          <div class="details-row">
            <div class="details-label">Method</div>
            <div class="details-value method-${methodClass}">${method}</div>
          </div>
          <div class="details-row">
            <div class="details-label">URL</div>
            <div class="details-value">${request.url}</div>
          </div>
          <div class="details-row">
            <div class="details-label">Status</div>
            <div class="details-value">
              <span class="status-code status-${statusClass}">${
    response.status_code
  }</span>
              ${response.status_text || ""}
            </div>
          </div>
          <div class="details-row">
            <div class="details-label">Time</div>
            <div class="details-value">${formattedDate} ${formattedTime}</div>
          </div>
          <div class="details-row">
            <div class="details-label">Duration</div>
            <div class="details-value">${duration}</div>
          </div>
          <div class="details-row">
            <div class="details-label">IP</div>
            <div class="details-value">${request.client_ip || "N/A"}</div>
          </div>
        </div>
      </div>
    </div>

      <div class="details-section collapsed">
      <div class="section-title">Request Headers</div>
      <div class="section-content">
        <div class="details-table">
          ${requestHeadersContent}
        </div>
      </div>
    </div>

    <div class="details-section">
      <div class="section-title">Request Body</div>
      <div class="section-content">
        <div class="body-container">
          <button class="copy-btn" data-content="${encodeURIComponent(
            rawRequestBody
          )}">Copy</button>
          <pre class="body-content json-formatter">${requestBody}</pre>
        </div>
      </div>
    </div>

  

     <div class="details-section collapsed">
      <div class="section-title">Response Headers</div>
      <div class="section-content">
        <div class="details-table">
          ${responseHeadersContent}
        </div>
      </div>
    </div>

    <div class="details-section">
      <div class="section-title">Response Body</div>
      <div class="section-content">
        <div class="body-container">
          <button class="copy-btn" data-content="${encodeURIComponent(
            rawResponseBody
          )}">Copy</button>
          <pre class="body-content json-formatter">${responseBody}</pre>
        </div>
      </div>
    </div>

   

    
  `;

  // Add event listeners for replay buttons
  document.getElementById("replay-request").addEventListener("click", () => {
    replayRequest(log, false);
  });

  document.getElementById("edit-and-replay").addEventListener("click", () => {
    replayRequest(log, true);
  });

  // Add event listeners for copy buttons
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const content = decodeURIComponent(this.dataset.content);
      if (content) {
        copyToClipboard(content);
        this.classList.add("copied");
        this.textContent = "Copied!";

        // Reset button after 2 seconds
        setTimeout(() => {
          this.classList.remove("copied");
          this.textContent = "Copy";
        }, 2000);
      }
    });
  });
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
      clearAllData().catch((error) => {
        showError("Error clearing data:", error);
      });

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

// Update relative timestamps
function updateRelativeTimestamps() {
  const timeElements = document.querySelectorAll(
    ".request-time[data-timestamp]"
  );

  timeElements.forEach((element) => {
    const timestamp = element.getAttribute("data-timestamp");
    if (timestamp) {
      element.textContent = formatRelativeTime(timestamp);
    }
  });
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Load saved requests
  loadSavedRequests();

  // Connect to WebSocket with our message handler
  connectWebSocket(handleWebSocketMessage);

  // Setup UI components
  setupSearch();
  setupRequestFilters();
  setupClearRequests();
  setupDetailToggles();

  // Start timer to update relative timestamps
  setInterval(updateRelativeTimestamps, 30000); // Update every 30 seconds
});

// Replay a request
function replayRequest(log, editMode) {
  if (editMode) {
    showRequestEditor(log);
  } else {
    executeRequest(log.request);
  }
}

// Show request editor modal
function showRequestEditor(log) {
  // Create modal container
  const modal = document.createElement("div");
  modal.className = "request-editor-modal";

  // Format request body for editing
  let bodyContent = "";
  let contentType = "";

  if (log.request.headers && log.request.headers["Content-Type"]) {
    contentType = log.request.headers["Content-Type"];
  }

  if (log.request.body) {
    if (contentType.includes("application/json")) {
      try {
        const jsonObj =
          typeof log.request.body === "string"
            ? JSON.parse(log.request.body)
            : log.request.body;
        bodyContent = JSON.stringify(jsonObj, null, 2);
      } catch (e) {
        bodyContent = log.request.body;
      }
    } else {
      bodyContent = log.request.body;
    }
  }

  // Create modal content
  modal.innerHTML = `
    <div class="request-editor">
      <div class="editor-header">
        <h3>Edit Request</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="editor-content">
        <div class="editor-row">
          <label>Method:</label>
          <select id="edit-method">
            <option value="GET" ${
              log.request.method === "GET" ? "selected" : ""
            }>GET</option>
            <option value="POST" ${
              log.request.method === "POST" ? "selected" : ""
            }>POST</option>
            <option value="PUT" ${
              log.request.method === "PUT" ? "selected" : ""
            }>PUT</option>
            <option value="DELETE" ${
              log.request.method === "DELETE" ? "selected" : ""
            }>DELETE</option>
            <option value="PATCH" ${
              log.request.method === "PATCH" ? "selected" : ""
            }>PATCH</option>
          </select>
        </div>
        <div class="editor-row">
          <label>URL:</label>
          <input type="text" id="edit-url" value="${log.request.url}">
        </div>
        <div class="editor-row">
          <label>Headers:</label>
          <textarea id="edit-headers" rows="5">${formatHeadersForEdit(
            log.request.headers
          )}</textarea>
        </div>
        <div class="editor-row">
          <label>Body:</label>
          <textarea id="edit-body" rows="10">${bodyContent}</textarea>
        </div>
        <div class="editor-actions">
          <button id="send-request" class="action-btn">Send Request</button>
        </div>
      </div>
    </div>
  `;

  // Add modal to document
  document.body.appendChild(modal);

  // Add event listeners
  modal.querySelector(".close-btn").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  modal.querySelector("#send-request").addEventListener("click", () => {
    const editedRequest = {
      id: log.request.id,
      method: document.getElementById("edit-method").value,
      url: document.getElementById("edit-url").value,
      headers: parseHeadersFromEdit(
        document.getElementById("edit-headers").value
      ),
      body: document.getElementById("edit-body").value,
      timestamp: new Date().toISOString(),
      client_ip: log.request.client_ip,
      user_agent: log.request.user_agent,
    };

    document.body.removeChild(modal);
    executeRequest(editedRequest);
  });
}

// Format headers for editing
function formatHeadersForEdit(headers) {
  if (!headers) return "";

  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

// Parse headers from edit format
function parseHeadersFromEdit(headersText) {
  if (!headersText) return {};

  const headers = {};
  headersText.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length) {
      headers[key.trim()] = valueParts.join(":").trim();
    }
  });

  return headers;
}

// Execute the request
function executeRequest(request) {
  // Create fetch options
  const options = {
    method: request.method,
    headers: request.headers || {},
  };

  // Add body for non-GET requests
  if (request.method !== "GET" && request.body) {
    options.body = request.body;
  }

  // Show loading indicator
  showInfo("Sending request...");

  // Get the original URL
  let originalUrl;
  try {
    originalUrl = new URL(request.url);
  } catch (e) {
    showError(`Error: Invalid URL - ${request.url}`);
    return;
  }

  // Create a proxy URL that keeps the path and query parameters but uses the current host
  // This ensures the request goes through our proxy
  const currentHost = window.location.host; // e.g., "localhost:4040"
  const currentProtocol = window.location.protocol; // e.g., "http:"

  // Keep the original path and query string
  const proxyUrl = `${currentProtocol}//${currentHost}${originalUrl.pathname}${originalUrl.search}`;

  // Execute the request through our proxy
  fetch(proxyUrl, options)
    .then((response) => {
      // Read response headers
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Read response body
      return response.text().then((text) => {
        return {
          status: response.status,
          statusText: response.statusText,
          headers: headers,
          body: text,
        };
      });
    })
    .then((responseData) => {
      showSuccess(
        `Request completed: ${responseData.status} ${responseData.statusText}`
      );
    })
    .catch((error) => {
      showError(`Request failed: ${error.message}`);
    });
}
