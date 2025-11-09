# serve

The `serve` command starts the DRIFT server, initializes the reverse proxy, and launches the web dashboard for inspecting API traffic.

## Usage

```bash
drift serve [flags]
```

## Description

The `serve` command is the primary command for running DRIFT. When executed, it:

1. **Starts the HTTP server** on the specified port (default: 4040)
2. **Launches the web dashboard** accessible at `http://localhost:4040/inspector`
3. **Sets up WebSocket connections** for real-time log streaming
4. **Initializes the reverse proxy** (after configuration)
5. **Monitors backend health** continuously
6. **Manages Zrok tunneling** (if enabled)

## Flags

### `-p PORT`
Specify the port on which DRIFT should run.

**Type:** Integer
**Default:** 4040
**Priority:** Overrides both the `DRIFT_PORT` environment variable and the default port

**Examples:**
```bash
# Run on port 5050
drift serve -p 5050

# Run on port 8080
drift serve -p 8080

# Run on port 3001
drift serve -p 3001
```

## Environment Variables

### `DRIFT_PORT`
Alternative way to set the server port without using the `-p` flag.

```bash
# Set environment variable
export DRIFT_PORT=5050

# Start DRIFT (will use port 5050)
drift serve
```

!!! note "Port Priority"
    If both `-p` flag and `DRIFT_PORT` are set, the `-p` flag takes precedence.

## Examples

### Basic Usage

Start DRIFT with default settings:

```bash
drift serve
```

**What happens:**
- Server starts on port 4040
- Dashboard available at `http://localhost:4040/inspector/configure`
- Waiting for backend configuration

**Output:**
```
Starting DRIFT...
Server running on http://localhost:4040
```

### Custom Port

Start DRIFT on a specific port:

```bash
drift serve -p 8080
```

**What happens:**
- Server starts on port 8080
- Dashboard available at `http://localhost:8080/inspector/configure`

### Using Environment Variable

```bash
# Set the port
export DRIFT_PORT=5050

# Start DRIFT
drift serve
```

### Override Environment Variable

```bash
# Environment variable is set
export DRIFT_PORT=5050

# But flag takes precedence
drift serve -p 8080
# Server will run on 8080, not 5050
```

## Server Endpoints

Once the server is running, the following endpoints are available:

### Configuration Page
```
http://localhost:4040/inspector/configure
```
Configure your backend server and tunneling options.

### Dashboard
```
http://localhost:4040/inspector/dashboard
```
View intercepted requests and responses in real-time.

### Analytics
```
http://localhost:4040/inspector/analytics
```
View request statistics and trends.

### Status API
```
http://localhost:4040/status
```
JSON endpoint for checking server and backend status.

**Response example:**
```json
{
  "serverStatus": "Active",
  "localhostURL": "http://localhost:3000",
  "zrokURL": "https://abc123.share.zrok.io"
}
```

### WebSocket Endpoint
```
ws://localhost:4040/ws
```
WebSocket connection for real-time log streaming.

## How It Works

### 1. Server Initialization

When you run `drift serve`, the following happens:

```
┌─────────────────────────────────────┐
│  DRIFT Server Starts                │
│  - HTTP Server on port 4040         │
│  - WebSocket handler ready          │
│  - Static files loaded              │
│  - Cleanup handlers registered      │
└─────────────────────────────────────┘
```

### 2. Configuration Phase

Navigate to the configuration page and enter your backend details:

```
┌─────────────────────────────────────┐
│  User Configures Backend            │
│  - Backend port: 3000               │
│  - Tunneling: Auto/Custom/None      │
│  - Click "Start Intercepting"       │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  DRIFT Validates Backend            │
│  - Checks if port is reachable      │
│  - Creates reverse proxy            │
│  - Starts backend monitoring        │
│  - Initializes Zrok (if enabled)    │
└─────────────────────────────────────┘
```

### 3. Traffic Interception

Once configured, DRIFT intercepts all traffic:

```
Frontend Request
      ↓
┌─────────────────────────────────────┐
│  DRIFT Proxy                        │
│  - Captures request data            │
│  - Logs headers, body, timestamp    │
│  - Forwards to backend              │
└─────────────────────────────────────┘
      ↓
Backend Server (port 3000)
      ↓
Backend Response
      ↓
┌─────────────────────────────────────┐
│  DRIFT Proxy                        │
│  - Captures response data           │
│  - Logs status, headers, body       │
│  - Sends to WebSocket clients       │
│  - Returns to frontend              │
└─────────────────────────────────────┘
      ↓
Frontend Receives Response
```

### 4. Real-time Dashboard Updates

```
┌─────────────────────────────────────┐
│  Log Channel                        │
│  - Receives API logs                │
│  - Broadcasts via WebSocket         │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│  Dashboard (Browser)                │
│  - Receives logs in real-time       │
│  - Updates UI instantly             │
│  - Allows filtering/searching       │
└─────────────────────────────────────┘
```

## Features

### Request/Response Logging
Every HTTP request and response is captured with:
- HTTP method (GET, POST, PUT, DELETE, etc.)
- Full URL and path
- Request/response headers
- Request/response body
- Status code
- Timestamp
- Client IP address
- User agent

### Backend Health Monitoring
DRIFT continuously monitors your backend server:
- Checks connection every 5 seconds
- Updates status in dashboard
- Shows "Active" or "Inactive" status

### WebSocket Live Streaming
Real-time log delivery to the dashboard:
- Instant updates as requests happen
- No polling required
- Efficient and lightweight

### Zrok Integration
Optional public URL tunneling:
- Auto mode: Automatic URL generation
- Custom mode: Use reserved tokens
- Automatic cleanup on exit

## Troubleshooting

### Port Already in Use

**Error:**
```
Failed to start server: listen tcp :4040: bind: address already in use
```

**Solution:**
```bash
# Use a different port
drift serve -p 5050
```

### Cannot Access Dashboard

**Problem:** Browser shows "Connection refused"

**Solutions:**
1. Verify DRIFT is running: Check terminal output
2. Check the correct port: Use the port specified with `-p` or default 4040
3. Try `http://127.0.0.1:4040` instead of `localhost`
4. Check firewall settings

### Backend Not Reachable

**Error in configuration:** "Backend server on port 3000 is not reachable"

**Solutions:**
1. Ensure your backend is running: `curl http://localhost:3000`
2. Verify the port number is correct
3. Check if backend is listening on localhost
4. Review backend logs for errors

## Best Practices

### Development Workflow

1. **Start backend first**
   ```bash
   # Terminal 1: Start your backend
   npm run dev  # or your backend command
   ```

2. **Start DRIFT second**
   ```bash
   # Terminal 2: Start DRIFT
   drift serve
   ```

3. **Configure once, use many times**
   - Configuration persists during the session
   - No need to reconfigure unless backend port changes

### Production Use

!!! warning "Not for Production"
    DRIFT is designed for development and debugging. Do not use it in production environments as it:

    - Logs all request/response data (including sensitive information)
    - Adds latency to requests
    - Stores data in memory
    - Is not optimized for high traffic

### Security Considerations

- **Localhost only**: Dashboard is only accessible from localhost
- **No authentication**: Anyone with localhost access can view logs
- **Sensitive data**: Be careful with API keys, passwords, and tokens
- **Public URLs**: When using Zrok, your API becomes publicly accessible

## Related Commands

- [update](update.md) - Update DRIFT to the latest version
- [release](release.md) - Release reserved Zrok tokens

## See Also

- [Getting Started Guide](../getting-started.md)
- [Commands Overview](../commands.md)
- [Support](../support.md)
