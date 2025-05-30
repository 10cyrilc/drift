let requestData = [];
let requestTimestamps = [];
const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;
const MARGIN = { top: 40, right: 40, bottom: 60, left: 60 };
const INNER_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

function loadSavedData() {
  try {
    // Load full request data
    const savedData = sessionStorage.getItem("requestData");
    if (savedData) {
      requestData = JSON.parse(savedData);

      // Load timestamps directly if available
      const savedTimestamps = sessionStorage.getItem("requestTimestamps");
      if (savedTimestamps) {
        requestTimestamps = JSON.parse(savedTimestamps);
      } else {
        // Extract timestamps from request data as fallback
        requestTimestamps = requestData.map((log) =>
          new Date(log.request.timestamp).getTime()
        );
      }

      updateAnalytics();
      updateGraph();
    }
  } catch (error) {
    showError("Error loading saved data:", error);
  }
}

function connectWebSocket() {
  const ws = new WebSocket("ws://" + window.location.host + "/ws");

  ws.onmessage = function (event) {
    try {
      const log = JSON.parse(event.data);
      requestData.push(log);

      // Add timestamp for the graph
      const timestamp = new Date(log.request.timestamp).getTime();
      requestTimestamps.push(timestamp);

      // Save to sessionStorage
      sessionStorage.setItem("requestData", JSON.stringify(requestData));
      sessionStorage.setItem(
        "requestTimestamps",
        JSON.stringify(requestTimestamps)
      );

      updateAnalytics();
      updateGraph();
    } catch (error) {
      showError("Error processing message:", error);
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

function getTimeRange(timeRangeStr) {
  const now = new Date().getTime();
  let timeRange;

  switch (timeRangeStr) {
    case "1m":
      timeRange = 60 * 1000; // 1 minute in milliseconds
      break;
    case "5m":
      timeRange = 5 * 60 * 1000;
      break;
    case "10m":
      timeRange = 10 * 60 * 1000;
      break;
    case "30m":
      timeRange = 30 * 60 * 1000;
      break;
    case "1h":
      timeRange = 60 * 60 * 1000;
      break;
    case "6h":
      timeRange = 6 * 60 * 60 * 1000;
      break;
    case "12h":
      timeRange = 12 * 60 * 60 * 1000;
      break;
    case "24h":
      timeRange = 24 * 60 * 60 * 1000;
      break;
    default:
      timeRange = 60 * 60 * 1000; // Default to 1 hour
  }

  return {
    start: now - timeRange,
    end: now,
  };
}

function aggregateRequests(timeRange) {
  // Filter timestamps within the time range
  const filteredTimestamps = requestTimestamps.filter(
    (timestamp) => timestamp >= timeRange.start && timestamp <= timeRange.end
  );

  if (filteredTimestamps.length === 0) {
    return [];
  }

  // Determine the appropriate interval based on the time range
  const rangeInMinutes = (timeRange.end - timeRange.start) / (60 * 1000);
  let intervalInMinutes;

  if (rangeInMinutes <= 5) {
    intervalInMinutes = 0.1; // 6 seconds
  } else if (rangeInMinutes <= 30) {
    intervalInMinutes = 0.5; // 30 seconds
  } else if (rangeInMinutes <= 60) {
    intervalInMinutes = 1; // 1 minute
  } else if (rangeInMinutes <= 360) {
    intervalInMinutes = 5; // 5 minutes
  } else if (rangeInMinutes <= 720) {
    intervalInMinutes = 10; // 10 minutes
  } else {
    intervalInMinutes = 30; // 30 minutes
  }

  const intervalInMs = intervalInMinutes * 60 * 1000;

  // Create buckets for each interval within the time range
  const buckets = {};

  // Initialize all buckets in the time range to ensure we have empty periods
  for (let t = timeRange.start; t <= timeRange.end; t += intervalInMs) {
    buckets[t] = 0;
  }

  // Count requests in each bucket
  filteredTimestamps.forEach((timestamp) => {
    // Find which bucket this timestamp belongs to
    const bucketStart =
      Math.floor((timestamp - timeRange.start) / intervalInMs) * intervalInMs +
      timeRange.start;
    buckets[bucketStart] = (buckets[bucketStart] || 0) + 1;
  });

  // Convert to array of data points
  const dataPoints = Object.entries(buckets)
    .map(([timestamp, count]) => ({
      timestamp: parseInt(timestamp),
      count,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return dataPoints;
}

function updateGraph() {
  const chartContainer = document.getElementById("request-chart-container");
  if (!chartContainer) return;

  // Clear previous chart
  chartContainer.innerHTML = "";

  // Create canvas for Chart.js
  const canvas = document.createElement("canvas");
  canvas.id = "requests-chart";
  chartContainer.appendChild(canvas);

  // Get active time filter
  const activeFilter = document.querySelector(".filter-btn.active");
  const timeRangeStr = activeFilter
    ? activeFilter.getAttribute("data-time")
    : "1h";

  // Get time range
  const timeRange = getTimeRange(timeRangeStr);

  // Aggregate data
  const dataPoints = aggregateRequests(timeRange);

  if (dataPoints.length === 0) {
    chartContainer.innerHTML = `<div class="empty-chart">No data available for the selected time range</div>`;
    return;
  }

  // Prepare data for Chart.js
  const chartData = {
    labels: dataPoints.map((point) => new Date(point.timestamp)),
    datasets: [
      {
        label: "Number of Requests",
        data: dataPoints.map((point) => point.count),
        backgroundColor: "rgba(75, 192, 255, 0.7)",
        borderColor: "rgba(75, 192, 255, 1)",
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ],
  };

  // Get theme colors from CSS variables
  const computedStyle = getComputedStyle(document.documentElement);
  const textColor =
    computedStyle.getPropertyValue("--text-color").trim() || "#e2e8f0";
  const gridColor =
    computedStyle.getPropertyValue("--border-color").trim() || "#2d3748";
  const backgroundColor =
    computedStyle.getPropertyValue("--darker-color").trim() || "#1a202c";

  // Create the chart
  const ctx = canvas.getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: getTimeUnit(timeRangeStr),
            displayFormats: {
              second: "HH:mm:ss",
              minute: "HH:mm",
              hour: "HH:mm",
              day: "MMM D",
            },
          },
          grid: {
            color: gridColor,
            borderColor: textColor,
          },
          ticks: {
            color: textColor,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor,
            borderColor: textColor,
          },
          ticks: {
            color: textColor,
            precision: 0,
          },
          title: {
            display: true,
            text: "Number of Requests",
            color: textColor,
            font: {
              weight: "normal",
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
          cornerRadius: 4,
          callbacks: {
            title: function (tooltipItems) {
              const date = new Date(tooltipItems[0].parsed.x);
              return date.toLocaleString();
            },
            label: function (context) {
              return `Requests: ${context.parsed.y}`;
            },
          },
        },
      },
    },
  });
}

// Helper function to determine the appropriate time unit based on the selected time range
function getTimeUnit(timeRangeStr) {
  switch (timeRangeStr) {
    case "5m":
    case "15m":
    case "30m":
      return "second";
    case "1h":
    case "3h":
    case "6h":
      return "minute";
    case "12h":
    case "24h":
      return "hour";
    case "7d":
    case "30d":
      return "day";
    default:
      return "minute";
  }
}

function setupTimeFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updateGraph();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSavedData();
  connectWebSocket();
  setupTimeFilters();
  updateGraph();
});
