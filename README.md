# API Monitor with Go based Proxy 🔎

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
git clone https://github.com/10cyrilc/amgp.git
cd amgp

# Build the app
go build -o amgp
```

---

## 🚦 Usage

```bash
# Start with default port (4040)
./amgp

# Start with custom port
./amgp -port 5050

# Using environment variable
API_INTERCEPTOR_PORT=5050 ./amgp
```

---

## 🧩 How It Works

1. Frontend sends API requests to API Interceptor (instead of backend directly).
2. API Interceptor intercepts, logs, and forwards them to your actual backend.
3. Backend responses are logged and passed back to the frontend.
4. You view everything in the browser dashboard at `http://localhost:4040/inspector`.

```bash
Frontend --> [API Interceptor] --> Backend
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

## 🌐 Tunneling Support (Zrok)

- Easily expose your local instance to the internet:
  - Automatically connects using Zrok
  - Share a live link to your intercepted traffic with collaborators

---

## 📁 Folder Structure

```
api-interceptor/
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

---

## 🪪 License

[MIT](LICENSE)

---

## 🙌 Contributing

PRs welcome! For feature requests, open an issue. Let's make debugging APIs enjoyable together. 🚀
