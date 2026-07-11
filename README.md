# DRIFT - Dynamic Request Interception and Forwarding Tool 🔎

**A fast and lightweight reverse proxy for inspecting and debugging API traffic in real-time. Built in Go.**

---

## 🚀 Features

- **Request & Response Logging** – View complete API call data
- **Live Interception Dashboard** – Watch traffic as it flows
- **Public URL Tunneling** – Share your local API using Zrok
- **Method & Search Filtering** – Find what you need fast
- **JSON Prettifier** – Pretty prints JSON payloads for easy reading
- **WebSocket Support** – Monitor real-time data streams
- **Analytics Dashboard** – View request statistics and trends
- **Dark Themed UI** – Optimized for long debugging sessions

---

## 🛠️ Installation

```bash
# Clone the repo
git clone https://github.com/10cyrilc/drift.git
cd drift

# Build the app
go build
```

---

## 🚦 Usage

```bash
# Start with default settings (shows help)
./drift

# Start the server with default port (4040)
./drift serve

# Start with custom port
./drift serve -p 5050

# Show version information
./drift -v

# Show help information
./drift -h

# Update
./drift update

# Using environment variable
DRIFT_PORT=5050 ./drift serve
```

---

## 🧩 How It Works

1. Frontend sends API requests to API Interceptor (instead of backend directly).
2. API Interceptor intercepts, logs, and forwards them to your actual backend.
3. Backend responses are logged and passed back to the frontend.
4. You view everything in the browser dashboard at `http://localhost:4040/inspector`.

```bash
Frontend --> [DRIFT] --> Backend
                ↑
            Logging
                ↓
          [Web Dashboard]
```

---

## 📊 Dashboard UI

- Launch in browser: [http://localhost:4040/inspector/configure](http://localhost:4040/inspector/configure)
- Features:
  - Filter by method (GET, POST, etc.)
  - Search by path/content
  - View prettified headers & JSON
  - WebSocket live stream logs
  - Analytics dashboard with request statistics

---

## 🌐 Tunneling Support (Native Zrok Go SDK)

DRIFT integrates the **zrok Go SDK** directly into the binary. You **do not need the zrok CLI installed or configured in your system `PATH`** to share your local backend endpoints.

### Key Capabilities
- **Programmatic Enablement**: If your environment is not enabled, simply paste your zrok account token directly in the DRIFT configuration UI. DRIFT programmatically registers and configures your environment, writing settings to `~/.zrok2/` in the background.
- **Dynamic Configuration Cards**: Configure the tunnel using three clean options in the UI:
  - **Automatic**: Instantly registers a public share on the fly using a dynamically generated identifier.
  - **Reserve Name**: Lets you enter a custom unique name (e.g. `my-awesome-api`). DRIFT reserves the name and binds the share to it (`https://<custom-name>.shares.zrok.io`).
  - **Use Token**: Bind to any manually reserved name or existing token.
- **Interactive Cleanup**: When you terminate DRIFT in your terminal using `Ctrl + C`, the server stops the active listener and prompts:
  `Do you want to release the zrok token '<token>'? (y/N): `
  Entering `y`/`yes` releases the name reservation from your account. Otherwise, the name remains reserved for future use.
- **Zombie Share Pre-Cleanup**: If DRIFT experienced a previous crash or dirty exit, it queries the account overview upon restart and automatically detaches any dead zombie shares bound to your reserved name before starting the new session, avoiding conflict errors.

---

## 📁 Folder Structure

```
drift/
├── internal/
│   ├── config/       # CLI + env config
│   ├── handlers/     # Proxy, WebSocket, status endpoints
│   ├── logging/      # Log collection & storage
│   ├── models/       # Structs for request/response logs
│   ├── proxy/        # Reverse proxy logic
│   ├── server/       # HTTP server setup
│   └── tunnel/       # Zrok integration
├── static/           # Web dashboard (HTML/CSS/JS)
│   ├── analytics/    # Analytics dashboard
│   ├── dashboard/    # Main request inspector
│   └── landing/      # Configuration page
├── main.go
├── go.mod
├── README.md
```

---

## 🧪 Development Notes

- Built with Go 1.20+
- Self-contained binary with embedded static files using Go `embed`
- Dependencies:
  - github.com/google/uuid
  - github.com/gorilla/websocket
  - github.com/rhysd/go-github-selfupdate

---

## 🪪 License

[MIT](LICENSE)

---

## 🙌 Contributing

PRs welcome! For feature requests, open an issue. Let's make debugging APIs enjoyable together. 🚀
