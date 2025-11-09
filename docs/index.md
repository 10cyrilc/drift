# Welcome to DRIFT 🔎

**DRIFT** (Dynamic Request Interception and Forwarding Tool) is a fast and lightweight reverse proxy built in Go for inspecting and debugging API traffic in real-time.

## What is DRIFT?

DRIFT sits between your frontend and backend applications, intercepting all HTTP traffic, logging complete request and response data, and providing a beautiful web dashboard to inspect everything in real-time. Think of it as a developer-friendly "man-in-the-middle" tool for debugging APIs.

## Key Features

### 🔍 **Request & Response Logging**
View complete API call data including headers, body, status codes, and timestamps for every request that flows through DRIFT.

### 📊 **Live Interception Dashboard**
Watch traffic as it flows through your application with a real-time WebSocket-powered dashboard that updates instantly.

### 🌐 **Public URL Tunneling**
Share your local API with collaborators or test webhooks using integrated Zrok tunneling support. Get a public URL instantly.

### 🔎 **Method & Search Filtering**
Quickly find the requests you need with powerful filtering by HTTP method (GET, POST, PUT, DELETE, etc.) and full-text search.

### ✨ **JSON Prettifier**
Automatically formats and syntax-highlights JSON payloads for easy reading and debugging.

### 🔌 **WebSocket Support**
Monitor real-time data streams and WebSocket connections alongside your regular HTTP traffic.

### 📈 **Analytics Dashboard**
View request statistics, trends, and patterns to understand your API usage better.

### 🌙 **Dark Themed UI**
A beautiful, modern dark theme optimized for long debugging sessions and reduced eye strain.

## How It Works

```
Frontend  →  [DRIFT Proxy]  →  Backend
                   ↓
              [Logging]
                   ↓
           [Web Dashboard]
```

1. **Configure**: Point DRIFT to your backend server's port
2. **Intercept**: DRIFT intercepts all requests from your frontend
3. **Log**: Every request and response is captured and logged
4. **Forward**: Requests are forwarded to your actual backend
5. **Inspect**: View everything in the browser dashboard at `http://localhost:4040/inspector`

## Quick Start

```bash
# Download and run DRIFT
drift serve

# Configure your backend port in the browser
# Open http://localhost:4040/inspector/configure

# Point your frontend to http://localhost:4040 instead of your backend
# Start inspecting traffic!
```

## Use Cases

- **API Debugging**: See exactly what data is being sent and received
- **Frontend Development**: Verify your frontend is sending correct requests
- **Backend Development**: Inspect incoming requests without adding logging code
- **Webhook Testing**: Use public URLs to test webhook integrations
- **Team Collaboration**: Share live API traffic with remote team members
- **API Documentation**: Capture real request/response examples
- **Performance Analysis**: Monitor response times and identify slow endpoints

## What's Next?

- [Getting Started](getting-started.md) - Install and run DRIFT
- [Commands](commands.md) - Learn about available commands
- [Support](support.md) - Get help and report issues
- [Contributing](contributing.md) - Contribute to DRIFT

---

**Built with ❤️ in Go** | [GitHub](https://github.com/10cyrilc/drift) | [Report Issues](https://github.com/10cyrilc/drift/issues)
