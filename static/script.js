let ws;
let selectedRequestId = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const requestCache = {};

// Function to format request details in a more readable way
function formatRequestDetails(log) {
  const { request, response } = log;

  // Format request headers
  let requestHeadersHtml = "";
  for (const [key, value] of Object.entries(request.headers)) {
    requestHeadersHtml += `<div class="header-item"><span class="header-key">${key}:</span> <span class="header-value">${value}</span></div>`;
  }

  // Format response headers
  let responseHeadersHtml = "";
  for (const [key, value] of Object.entries(response.headers)) {
    responseHeadersHtml += `<div class="header-item"><span class="header-key">${key}:</span> <span class="header-value">${value}</span></div>`;
  }

  // Try to pretty-print JSON bodies
  let requestBody = request.body;
  let responseBody = response.body;

  try {
    if (
      request.body &&
      (request.headers["Content-Type"]?.includes("application/json") ||
        request.body.trim().startsWith("{") ||
        request.body.trim().startsWith("["))
    ) {
      const parsedBody = JSON.parse(request.body);
      requestBody = JSON.stringify(parsedBody, null, 2);
    }
  } catch (e) {
    // Not JSON, use as is
  }

  try {
    if (
      response.body &&
      (response.headers["Content-Type"]?.includes("application/json") ||
        response.body.trim().startsWith("{") ||
        response.body.trim().startsWith("["))
    ) {
      const parsedBody = JSON.parse(response.body);
      responseBody = JSON.stringify(parsedBody, null, 2);
    }
  } catch (e) {
    // Not JSON, use as is
  }

  // Add syntax highlighting for JSON
  if (
    requestBody &&
    (request.body.trim().startsWith("{") || request.body.trim().startsWith("["))
  ) {
    requestBody = highlightJson(requestBody);
  }

  if (
    responseBody &&
    (response.body.trim().startsWith("{") ||
      response.body.trim().startsWith("["))
  ) {
    responseBody = highlightJson(responseBody);
  }

  // Calculate response time if possible
  let responseTime = "";
  if (request.timestamp && response.timestamp) {
    const timeDiff = new Date(response.timestamp) - new Date(request.timestamp);
    responseTime = `<div class="details-item">
      <div class="details-label">Response Time:</div>
      <div class="details-value">${timeDiff}ms</div>
    </div>`;
  }

  // Format the URL to highlight path parameters
  const formattedUrl = formatUrl(request.url);

  // Build the HTML
  return `
    <div class="details-container">
      <div class="details-section">
        <h3 class="section-title">Request</h3>
        <div class="details-item">
          <div class="details-label">Method:</div>
          <div class="details-value method-${request.method.toLowerCase()}">${
    request.method
  }</div>
        </div>
        <div class="details-item">
          <div class="details-label">URL:</div>
          <div class="details-value">${formattedUrl}</div>
        </div>
        <div class="details-item">
          <div class="details-label">Time:</div>
          <div class="details-value">${new Date(
            request.timestamp
          ).toLocaleString()}</div>
        </div>
        <div class="details-item">
          <div class="details-label">Headers:</div>
          <div class="details-value headers-container">${
            requestHeadersHtml || "<em>No headers</em>"
          }</div>
        </div>
        <div class="details-item">
          <div class="details-label">Body:</div>
          <div class="details-value"><pre class="body-content">${
            requestBody || "<em>No body</em>"
          }</pre></div>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Response</h3>
        <div class="details-item">
          <div class="details-label">Status:</div>
          <div class="details-value status-code status-${Math.floor(
            response.status_code / 100
          )}xx">${response.status_code}</div>
        </div>
        ${responseTime}
        <div class="details-item">
          <div class="details-label">Time:</div>
          <div class="details-value">${new Date(
            response.timestamp
          ).toLocaleString()}</div>
        </div>
        <div class="details-item">
          <div class="details-label">Headers:</div>
          <div class="details-value headers-container">${
            responseHeadersHtml || "<em>No headers</em>"
          }</div>
        </div>
        <div class="details-item">
          <div class="details-label">Body:</div>
          <div class="details-value"><pre class="body-content">${
            responseBody || "<em>No body</em>"
          }</pre></div>
        </div>
      </div>
    </div>
  `;
}

// Simple function to highlight JSON syntax
function highlightJson(json) {
  return json
    .replace(/(".*?"):/g, '<span style="color: #e74c3c;">$1</span>:')
    .replace(/: ("[^"]*")/g, ': <span style="color: #2ecc71;">$1</span>')
    .replace(/: (\d+)/g, ': <span style="color: #3498db;">$1</span>')
    .replace(/: (true|false)/g, ': <span style="color: #9b59b6;">$1</span>')
    .replace(/: (null)/g, ': <span style="color: #7f8c8d;">$1</span>');
}

// Format URL to highlight path parameters
function formatUrl(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const pathParts = path.split("/");

    const formattedPath = pathParts
      .map((part) => {
        if (
          part &&
          (/^[0-9a-f]{24}$/i.test(part) || // MongoDB ID pattern
            /^\d+$/.test(part) || // Numeric ID
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              part
            )) // UUID pattern
        ) {
          return `/<span style="background-color: #fff3cd; padding: 0 4px; border-radius: 3px;">${part}</span>`;
        }
        return part ? `/${part}` : "";
      })
      .join("");

    let queryParamsFormatted = "";
    if (urlObj.search) {
      queryParamsFormatted = urlObj.search
        .replace(/^\?/, "?<br>")
        .replace(/&/g, "<br>&");
    }

    return `${urlObj.protocol}//${urlObj.host}${formattedPath}${queryParamsFormatted}`;
  } catch (e) {
    return url;
  }
}

// Format time ago for display
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Toggle empty state visibility
function toggleEmptyState() {
  const requestsList = document.getElementById("requests");
  const emptyState = document.getElementById("empty-requests");

  if (!requestsList || !emptyState) return;

  emptyState.style.display = requestsList.children.length > 0 ? "none" : "flex";
}

function connectWebSocket() {
  ws = new WebSocket("ws://" + window.location.host + "/ws");

  ws.onopen = function () {
    reconnectAttempts = 0;
    const statusEl = document.getElementById("server-status");
    statusEl.textContent = "Server Status: Connected";
    statusEl.classList.add("connected");
    statusEl.classList.remove("disconnected");
  };

  ws.onmessage = function (event) {
    try {
      const log = JSON.parse(event.data);

      // Store the request in cache
      requestCache[log.request.id] = log;

      const requestList = document.getElementById("requests");
      const li = document.createElement("li");

      // Format the URL for display
      const urlObj = new URL(log.request.url);
      const path = urlObj.pathname;

      li.innerHTML = `
        <div class="request-list-content">
          <div class="request-path">${path}</div>
          <div class="request-time">${formatTimeAgo(
            new Date(log.request.timestamp)
          )}</div>
        </div>
        <div class="request-status status-${Math.floor(
          log.response.status_code / 100
        )}xx">${log.response.status_code}</div>
      `;

      li.dataset.id = log.request.id;
      li.dataset.method = log.request.method;
      li.onclick = () => {
        selectedRequestId = log.request.id;
        document
          .querySelectorAll("#requests li")
          .forEach((item) => item.classList.remove("selected"));
        li.classList.add("selected");

        const details = document.getElementById("details");
        const formattedDetails = formatRequestDetails(log);
        details.innerHTML = formattedDetails;
      };

      requestList.prepend(li);

      // Auto-select first request if none selected
      if (!selectedRequestId) {
        li.click();
      }

      toggleEmptyState();
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  ws.onclose = function () {
    const statusEl = document.getElementById("server-status");
    statusEl.textContent = "Server Status: Disconnected";
    statusEl.classList.remove("connected");
    statusEl.classList.add("disconnected");

    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(connectWebSocket, 5000);
    } else {
      statusEl.textContent = "Server Status: Failed to reconnect";
    }
  };

  ws.onerror = function () {
    // Silent error handling
  };
}

function updateStatus() {
  fetch("/status")
    .then((response) => response.json())
    .then((data) => {
      document.getElementById(
        "localhost-url"
      ).textContent = `Localhost URL: ${data.localhostURL}`;

      const zrokElement = document.getElementById("zrok-url");
      if (data.zrokURL && data.zrokURL.includes("http")) {
        zrokElement.innerHTML = `Public URL: <a href="${data.zrokURL}" target="_blank">${data.zrokURL}</a>`;
        zrokElement.classList.add("has-url");
      } else {
        zrokElement.textContent = `Public URL: ${
          data.zrokURL || "Not available"
        }`;
        zrokElement.classList.remove("has-url");
      }
    })
    .catch((error) => {
      console.error("Error fetching status:", error);
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

      item.style.display =
        method.includes(searchTerm) ||
        url.includes(searchTerm) ||
        status.includes(searchTerm)
          ? ""
          : "none";
    });
  });
}

// Setup request filtering
function setupRequestFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  if (!filterButtons.length) return;

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const method = btn.dataset.method;
      const requestItems = document.querySelectorAll("#requests li");

      requestItems.forEach((item) => {
        item.style.display =
          method === "all" || item.dataset.method.toLowerCase() === method
            ? ""
            : "none";
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
      selectedRequestId = null;
      Object.keys(requestCache).forEach((key) => delete requestCache[key]);
      toggleEmptyState();
    }
  });
}

// Toggle request and response sections
function setupDetailToggles() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("section-title")) {
      const section = e.target.closest(".details-section");
      section.classList.toggle("collapsed");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (
    window.location.pathname === "/inspector/dashboard" ||
    window.location.pathname === "/inspector/dashboard/"
  ) {
    document.getElementById("landing").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    updateStatus();
    setInterval(updateStatus, 5000);
    connectWebSocket();
    setupSearch();
    setupDetailToggles();
    setupRequestFilters();
    setupClearRequests();

    toggleEmptyState();
  }

  const form = document.getElementById("port-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const button = form.querySelector("button");
      const originalText = button.textContent;
      button.textContent = "Connecting...";
      button.disabled = true;

      fetch(form.action, {
        method: form.method,
        body: formData,
      })
        .then((response) => {
          if (response.redirected) {
            window.location.href = response.url;
          } else {
            button.textContent = originalText;
            button.disabled = false;
          }
        })
        .catch((error) => {
          console.error("Error submitting form:", error);
          button.textContent = originalText;
          button.disabled = false;
        });
    });
  }
});
