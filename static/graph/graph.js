let requestTimestamps = [];
let requestData = []; // Store full request data, not just timestamps

// SVG drawing constants
const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;
const MARGIN = { top: 40, right: 40, bottom: 60, left: 60 };
const INNER_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

// Load saved data from sessionStorage on page load
function loadSavedData() {
  try {
    // Load timestamps
    const savedTimestamps = sessionStorage.getItem("requestTimestamps");
    if (savedTimestamps) {
      requestTimestamps = JSON.parse(savedTimestamps);
    }

    // Load full request data
    const savedData = sessionStorage.getItem("requestData");
    if (savedData) {
      requestData = JSON.parse(savedData);
    }

    updateGraph();
  } catch (error) {
    console.error("Error loading saved data:", error);
  }
}

function connectWebSocket(onMessage) {
  const ws = new WebSocket("ws://" + window.location.host + "/ws");

  ws.onopen = function () {
    console.log("WebSocket connected");
  };

  ws.onmessage = function (event) {
    try {
      const log = JSON.parse(event.data);
      onMessage(log);
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  ws.onclose = function () {
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = function () {};
}

function getTimeRange(timeRangeStr) {
  const now = Date.now();
  switch (timeRangeStr) {
    case "1m":
      return {
        milliseconds: 60 * 1000,
        interval: 5 * 1000, // 5 second intervals
        format: "%H:%M:%S",
        tickCount: 12,
      };
    case "5m":
      return {
        milliseconds: 5 * 60 * 1000,
        interval: 30 * 1000, // 30 second intervals
        format: "%H:%M:%S",
        tickCount: 10,
      };
    case "10m":
      return {
        milliseconds: 10 * 60 * 1000,
        interval: 1 * 60 * 1000, // 1 minute intervals
        format: "%H:%M:%S",
        tickCount: 10,
      };
    case "30m":
      return {
        milliseconds: 30 * 60 * 1000,
        interval: 5 * 60 * 1000, // 5 minute intervals
        format: "%H:%M:%S",
        tickCount: 6,
      };
    case "1h":
      return {
        milliseconds: 60 * 60 * 1000,
        interval: 10 * 60 * 1000, // 10 minute intervals
        format: "%H:%M",
        tickCount: 6,
      };
    case "2h":
      return {
        milliseconds: 2 * 60 * 60 * 1000,
        interval: 15 * 60 * 1000, // 15 minute intervals
        format: "%H:%M",
        tickCount: 8,
      };
    case "1d":
      return {
        milliseconds: 24 * 60 * 60 * 1000,
        interval: 30 * 60 * 1000, // 30 minute intervals
        format: "%H:%M",
        tickCount: 48,
      };
    default:
      return {
        milliseconds: 60 * 60 * 1000,
        interval: 10 * 60 * 1000, // 10 minute intervals
        format: "%H:%M",
        tickCount: 6,
      };
  }
}

function aggregateRequests(timeRange) {
  const now = Date.now();
  const startTime = now - timeRange.milliseconds;
  const buckets = {};
  const requestsByBucket = {}; // Store requests by bucket for hover tooltip

  // Initialize buckets
  for (let t = startTime; t <= now; t += timeRange.interval) {
    buckets[t] = 0;
    requestsByBucket[t] = [];
  }

  // Count requests in each bucket and store request data
  requestTimestamps.forEach((ts, index) => {
    if (ts >= startTime) {
      const bucket = Math.floor(ts / timeRange.interval) * timeRange.interval;
      buckets[bucket] = (buckets[bucket] || 0) + 1;

      // Store the request data in the corresponding bucket
      if (requestData[index]) {
        if (!requestsByBucket[bucket]) {
          requestsByBucket[bucket] = [];
        }
        requestsByBucket[bucket].push(requestData[index]);
      }
    }
  });

  // Convert to array format
  return Object.entries(buckets).map(([time, count]) => ({
    time: parseInt(time),
    count: count,
    requests: requestsByBucket[time] || [],
  }));
}

function showTooltip(x, y, content) {
  let tooltip = document.getElementById("graph-tooltip");

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "graph-tooltip";
    document.body.appendChild(tooltip);
  }

  tooltip.innerHTML = content;
  tooltip.style.display = "block";
  tooltip.style.left = `${x + 10}px`;
  tooltip.style.top = `${y + 10}px`;
}

function hideTooltip() {
  const tooltip = document.getElementById("graph-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
  }
}

function formatRequestForTooltip(request) {
  if (!request) return "";

  const method = request.request.method;
  const url = new URL(request.request.url).pathname;
  const status = request.response.status_code;
  const time = new Date(request.request.timestamp).toLocaleTimeString();

  return `
    <div class="tooltip-request">
      <span class="method method-${method.toLowerCase()}">${method}</span>
      <span class="path">${url}</span>
      <span class="status status-${Math.floor(status / 100)}xx">${status}</span>
      <span class="time">${time}</span>
    </div>
  `;
}

function updateGraph() {
  const activeFilter = document.querySelector(".filter-btn.active");
  const timeRange = getTimeRange(activeFilter.dataset.time);
  const dataPoints = aggregateRequests(timeRange);

  // Clear existing graph
  const graphContainer = document.getElementById("request-chart-container");
  graphContainer.innerHTML = "";

  // Create SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", SVG_WIDTH);
  svg.setAttribute("height", SVG_HEIGHT);
  graphContainer.appendChild(svg);

  // Create graph group with margin
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `translate(${MARGIN.left},${MARGIN.top})`);
  svg.appendChild(g);

  // Calculate scales
  const xMin = Date.now() - timeRange.milliseconds;
  const xMax = Date.now();
  const yMax = Math.max(...dataPoints.map((d) => d.count), 1);

  // X scale function
  const xScale = (time) => {
    return (INNER_WIDTH * (time - xMin)) / (xMax - xMin);
  };

  // Y scale function
  const yScale = (count) => {
    return INNER_HEIGHT - (INNER_HEIGHT * count) / yMax;
  };

  // Draw X axis
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "g");
  xAxis.setAttribute("transform", `translate(0,${INNER_HEIGHT})`);

  // X axis line
  const xAxisLine = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  xAxisLine.setAttribute("x1", 0);
  xAxisLine.setAttribute("y1", 0);
  xAxisLine.setAttribute("x2", INNER_WIDTH);
  xAxisLine.setAttribute("y2", 0);
  xAxisLine.setAttribute("stroke", "var(--text-color)");
  xAxis.appendChild(xAxisLine);

  // X axis ticks
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const tickTime = xMin + (i / tickCount) * (xMax - xMin);
    const x = xScale(tickTime);

    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("x1", x);
    tick.setAttribute("y1", 0);
    tick.setAttribute("x2", x);
    tick.setAttribute("y2", 5);
    tick.setAttribute("stroke", "var(--text-color)");
    xAxis.appendChild(tick);

    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    label.setAttribute("x", x);
    label.setAttribute("y", 20);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "var(--text-color)");
    label.textContent = new Date(tickTime).toLocaleTimeString();
    label.style.fontSize = "12px";
    xAxis.appendChild(label);
  }

  g.appendChild(xAxis);

  // Draw Y axis
  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "g");

  // Y axis line
  const yAxisLine = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  yAxisLine.setAttribute("x1", 0);
  yAxisLine.setAttribute("y1", 0);
  yAxisLine.setAttribute("x2", 0);
  yAxisLine.setAttribute("y2", INNER_HEIGHT);
  yAxisLine.setAttribute("stroke", "var(--text-color)");
  yAxis.appendChild(yAxisLine);

  // Y axis ticks
  for (let i = 0; i <= yMax; i++) {
    if (i > 10) {
      // Skip some ticks if there are too many
      if (i % Math.ceil(yMax / 10) !== 0) continue;
    }

    const y = yScale(i);

    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("x1", 0);
    tick.setAttribute("y1", y);
    tick.setAttribute("x2", -5);
    tick.setAttribute("y2", y);
    tick.setAttribute("stroke", "var(--text-color)");
    yAxis.appendChild(tick);

    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    label.setAttribute("x", -10);
    label.setAttribute("y", y + 5);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("fill", "var(--text-color)");
    label.textContent = i;
    label.style.fontSize = "12px";
    yAxis.appendChild(label);
  }

  g.appendChild(yAxis);

  // Draw the line
  if (dataPoints.length > 0) {
    const linePath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    let d = `M ${xScale(dataPoints[0].time)} ${yScale(dataPoints[0].count)}`;

    for (let i = 1; i < dataPoints.length; i++) {
      d += ` L ${xScale(dataPoints[i].time)} ${yScale(dataPoints[i].count)}`;
    }

    linePath.setAttribute("d", d);
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", "rgba(97, 176, 255, 1)");
    linePath.setAttribute("stroke-width", "2");
    g.appendChild(linePath);

    // Add area fill
    const areaPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    let areaD = d;
    areaD += ` L ${xScale(dataPoints[dataPoints.length - 1].time)} ${yScale(
      0
    )}`;
    areaD += ` L ${xScale(dataPoints[0].time)} ${yScale(0)} Z`;

    areaPath.setAttribute("d", areaD);
    areaPath.setAttribute("fill", "rgba(97, 176, 255, 0.2)");
    areaPath.setAttribute("stroke", "none");
    g.insertBefore(areaPath, linePath);

    // Add data points with hover capability
    dataPoints.forEach((point) => {
      if (point.count > 0) {
        const circle = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        circle.setAttribute("cx", xScale(point.time));
        circle.setAttribute("cy", yScale(point.count));
        circle.setAttribute("r", "5");
        circle.setAttribute("fill", "rgba(97, 176, 255, 1)");
        circle.setAttribute("stroke", "#fff");
        circle.setAttribute("stroke-width", "1");
        circle.setAttribute("class", "data-point");

        // Add hover events for tooltip
        circle.addEventListener("mouseover", (e) => {
          circle.setAttribute("r", "7"); // Enlarge on hover

          // Create tooltip content
          let tooltipContent = `
            <div class="tooltip-header">
              <strong>${point.count} Requests</strong>
              <div>${new Date(point.time).toLocaleTimeString()}</div>
            </div>
            <div class="tooltip-requests">
          `;

          // Add up to 5 requests to the tooltip
          const requestsToShow = point.requests.slice(0, 5);
          requestsToShow.forEach((req) => {
            tooltipContent += formatRequestForTooltip(req);
          });

          // Add "more" indicator if needed
          if (point.requests.length > 5) {
            tooltipContent += `<div class="tooltip-more">+ ${
              point.requests.length - 5
            } more requests</div>`;
          }

          tooltipContent += "</div>";

          showTooltip(e.clientX, e.clientY, tooltipContent);
        });

        circle.addEventListener("mouseout", () => {
          circle.setAttribute("r", "5"); // Reset size
          hideTooltip();
        });

        g.appendChild(circle);
      }
    });
  }

  // Add axis labels
  const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xLabel.setAttribute("x", INNER_WIDTH / 2);
  xLabel.setAttribute("y", INNER_HEIGHT + 45);
  xLabel.setAttribute("text-anchor", "middle");
  xLabel.setAttribute("fill", "var(--text-color)");
  xLabel.textContent = "Time";
  svg.appendChild(xLabel);

  const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yLabel.setAttribute(
    "transform",
    `translate(15, ${MARGIN.top + INNER_HEIGHT / 2}) rotate(-90)`
  );
  yLabel.setAttribute("text-anchor", "middle");
  yLabel.setAttribute("fill", "var(--text-color)");
  yLabel.textContent = "Number of Requests";
  svg.appendChild(yLabel);
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

function handleWebSocketMessage(log) {
  try {
    // Add timestamp to requestTimestamps
    const timestamp = new Date(log.request.timestamp).getTime();
    requestTimestamps.push(timestamp);

    // Add request to requestData
    requestData.push(log);

    // Update the graph
    updateGraph();
  } catch (error) {
    console.error("Error processing message:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSavedData(); // Load saved data first
  connectWebSocket(handleWebSocketMessage); // Pass the handler function
  setupTimeFilters();
  updateGraph();
});
