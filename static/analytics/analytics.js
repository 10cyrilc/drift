let requestData = [];

function loadSavedData() {
  try {
    const savedData = sessionStorage.getItem("requestData");
    if (savedData) {
      requestData = JSON.parse(savedData);
      updateAnalytics();
    }
  } catch (error) {
    console.error("Error loading saved data:", error);
  }
}

function connectWebSocket() {
  const ws = new WebSocket("ws://" + window.location.host + "/ws");

  ws.onopen = function () {
    console.log("WebSocket connected");
  };

  ws.onmessage = function (event) {
    try {
      const log = JSON.parse(event.data);
      requestData.push(log);
      updateAnalytics();
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  ws.onclose = function () {
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = function () {};
}

function updateAnalytics() {
  if (requestData.length === 0) return;

  updateTotalRequests();
  updateAverageResponseTime();
  updateUniqueVisitors();
  updateMethodsChart();
  updateStatusChart();
  updateTopEndpoints();
  updateTopErrors();
}

function updateTotalRequests() {
  document.getElementById("total-requests").textContent = requestData.length;
}

function updateAverageResponseTime() {
  let totalTime = 0;
  let count = 0;

  requestData.forEach((log) => {
    if (log.request.timestamp && log.response.timestamp) {
      const reqTime = new Date(log.request.timestamp).getTime();
      const respTime = new Date(log.response.timestamp).getTime();
      const diff = respTime - reqTime;

      if (diff > 0) {
        totalTime += diff;
        count++;
      }
    }
  });

  const avgTime = count > 0 ? Math.round(totalTime / count) : 0;
  document.getElementById("avg-response-time").textContent = `${avgTime} ms`;
}

function updateUniqueVisitors() {
  const uniqueIPs = new Set();

  requestData.forEach((log) => {
    if (log.request.client_ip) {
      uniqueIPs.add(log.request.client_ip);
    }
  });

  document.getElementById("unique-visitors").textContent = uniqueIPs.size;
}

function updateMethodsChart() {
  const methodCounts = {};

  requestData.forEach((log) => {
    const method = log.request.method.toLowerCase();
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });

  const chartContainer = document.getElementById("methods-chart");
  chartContainer.innerHTML = "";

  const barChart = document.createElement("div");
  barChart.className = "bar-chart";

  // Sort methods by count (descending)
  const sortedMethods = Object.entries(methodCounts).sort(
    (a, b) => b[1] - a[1]
  );

  // Find the maximum count for scaling
  const maxCount = Math.max(...Object.values(methodCounts));

  sortedMethods.forEach(([method, count]) => {
    const barContainer = document.createElement("div");
    barContainer.className = "bar-container";

    const bar = document.createElement("div");
    bar.className = `bar ${method}`;
    const heightPercent = (count / maxCount) * 100;
    bar.style.height = `${heightPercent}%`;

    const barValue = document.createElement("div");
    barValue.className = "bar-value";
    barValue.textContent = count;
    bar.appendChild(barValue);

    const barLabel = document.createElement("div");
    barLabel.className = "bar-label";
    barLabel.textContent = method.toUpperCase();

    barContainer.appendChild(bar);
    barContainer.appendChild(barLabel);
    barChart.appendChild(barContainer);
  });

  chartContainer.appendChild(barChart);
}

function updateStatusChart() {
  const statusCounts = {
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  };

  requestData.forEach((log) => {
    const statusCode = log.response.status_code;
    const statusGroup = `${Math.floor(statusCode / 100)}xx`;

    if (statusCounts[statusGroup] !== undefined) {
      statusCounts[statusGroup]++;
    }
  });

  const chartContainer = document.getElementById("status-chart");
  chartContainer.innerHTML = "";

  const barChart = document.createElement("div");
  barChart.className = "bar-chart";

  // Find the maximum count for scaling
  const maxCount = Math.max(...Object.values(statusCounts));

  Object.entries(statusCounts).forEach(([statusGroup, count]) => {
    const barContainer = document.createElement("div");
    barContainer.className = "bar-container";

    const bar = document.createElement("div");
    bar.className = `bar status-${statusGroup}`;
    const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
    bar.style.height = `${heightPercent}%`;

    const barValue = document.createElement("div");
    barValue.className = "bar-value";
    barValue.textContent = count;
    bar.appendChild(barValue);

    const barLabel = document.createElement("div");
    barLabel.className = "bar-label";
    barLabel.textContent = statusGroup;

    barContainer.appendChild(bar);
    barContainer.appendChild(barLabel);
    barChart.appendChild(barContainer);
  });

  chartContainer.appendChild(barChart);
}

function updateTopEndpoints() {
  const endpointCounts = {};

  requestData.forEach((log) => {
    const url = new URL(log.request.url);
    const endpoint = url.pathname;
    endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
  });

  const sortedEndpoints = Object.entries(endpointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5 endpoints

  const totalRequests = requestData.length;
  const tableBody = document.querySelector("#top-endpoints tbody");

  if (sortedEndpoints.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="3" class="empty-table">No data available</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";

  sortedEndpoints.forEach(([endpoint, count]) => {
    const percentage = ((count / totalRequests) * 100).toFixed(1);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${endpoint}</td>
      <td>${count}</td>
      <td>${percentage}%</td>
    `;
    tableBody.appendChild(row);
  });
}

function updateTopErrors() {
  const errorRequests = requestData.filter((log) => {
    const statusCode = log.response.status_code;
    return statusCode >= 400;
  });

  const errorCounts = {};

  errorRequests.forEach((log) => {
    const url = new URL(log.request.url);
    const endpoint = url.pathname;
    const statusCode = log.response.status_code;
    const key = `${statusCode}:${endpoint}`;

    errorCounts[key] = (errorCounts[key] || 0) + 1;
  });

  const sortedErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5 errors

  const tableBody = document.querySelector("#top-errors tbody");

  if (sortedErrors.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="3" class="empty-table">No data available</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";

  sortedErrors.forEach(([key, count]) => {
    const [statusCode, endpoint] = key.split(":");
    const statusGroup = `${Math.floor(statusCode / 100)}xx`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="status-code status-${statusGroup}">${statusCode}</span></td>
      <td>${endpoint}</td>
      <td>${count}</td>
    `;
    tableBody.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSavedData();
  connectWebSocket();
});
