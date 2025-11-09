# Getting Started

This guide will walk you through the process of installing, configuring, and using DRIFT to inspect your API traffic.

## Installation

### Option 1: Download Pre-built Binary (Recommended)

Download the latest version of DRIFT for your operating system from the [releases page](https://github.com/10cyrilc/drift/releases).

**Available platforms:**
- Linux (amd64, arm64)
- macOS (amd64, arm64)
- Windows (amd64)

**Steps:**
1. Download the appropriate binary for your system
2. Extract the archive
3. (Optional) Move the binary to a directory in your PATH
4. Make it executable (Linux/macOS): `chmod +x drift`

### Option 2: Build from Source

If you have Go installed, you can build DRIFT from source:

```bash
# Clone the repository
git clone https://github.com/10cyrilc/drift.git
cd drift

# Build the application
go build

# Run DRIFT
./drift serve
```

**Requirements:**
- Go 1.21 or higher
- Git

## Running DRIFT

### Start the Server

Once you have DRIFT installed, start the server using the `serve` command:

```bash
drift serve
```

By default, DRIFT runs on port **4040**. You can specify a different port using the `-p` flag:

```bash
drift serve -p 5050
```

Or use the `DRIFT_PORT` environment variable:

```bash
DRIFT_PORT=5050 drift serve
```

!!! note "Port Priority"
    The `-p` flag takes precedence over the `DRIFT_PORT` environment variable, which takes precedence over the default port (4040).

### Configure Your Backend

After starting DRIFT, open your browser and navigate to:

```
http://localhost:4040/inspector/configure
```

You'll see the configuration page where you need to:

1. **Enter your backend port** - The port where your actual backend server is running (e.g., 3000, 8000, 8080)
2. **Choose tunneling option** (optional):
   - **Auto**: Automatically creates a public URL using Zrok
   - **Custom**: Use a reserved Zrok token for a consistent public URL
   - **None**: Skip public URL creation

3. Click **"Start Intercepting"**

!!! warning "Backend Must Be Running"
    Make sure your backend server is running on the specified port before configuring DRIFT. DRIFT will verify the connection before starting.

## Using DRIFT

### Point Your Frontend to DRIFT

Instead of pointing your frontend to your backend directly, point it to DRIFT:

**Before:**
```javascript
// Your frontend code
const API_URL = 'http://localhost:3000';
```

**After:**
```javascript
// Point to DRIFT instead
const API_URL = 'http://localhost:4040';
```

### Access the Dashboard

Once configured, DRIFT will redirect you to the dashboard:

```
http://localhost:4040/inspector/dashboard
```

Here you can:
- View all intercepted requests and responses
- Filter by HTTP method (GET, POST, PUT, DELETE, etc.)
- Search through request/response data
- View prettified JSON payloads
- See request headers, status codes, and timestamps
- Monitor backend server status

### View Analytics

Access the analytics dashboard to see request statistics:

```
http://localhost:4040/inspector/analytics
```

Features:
- Total request count
- Requests by HTTP method
- Response status code distribution
- Request timeline and trends

## Public URL Tunneling (Optional)

DRIFT integrates with [Zrok](https://zrok.io/) to create public URLs for your local server. This is useful for:

- Testing webhooks from external services
- Sharing your local API with remote team members
- Demonstrating features to clients

### Auto Mode

Simply select "Auto" in the configuration page, and DRIFT will automatically create a public URL for you.

### Custom Token Mode

For consistent URLs across sessions:

1. **Reserve a Zrok token** (requires Zrok CLI):
   ```bash
   zrok reserve public --backend-mode proxy 4040
   ```

2. **Copy the token** from the output

3. **Enter the token** in DRIFT's configuration page

4. The same public URL will be used every time you use this token

!!! tip "Token Management"
    DRIFT automatically releases Zrok tokens when you stop the server. You can also manually release tokens using the `drift release` command.

## Workflow Example

Here's a complete workflow for using DRIFT:

1. **Start your backend server**
   ```bash
   # Example: Node.js backend on port 3000
   npm run dev
   ```

2. **Start DRIFT**
   ```bash
   drift serve
   ```

3. **Configure DRIFT**
   - Open `http://localhost:4040/inspector/configure`
   - Enter backend port: `3000`
   - Choose tunneling option (or skip)
   - Click "Start Intercepting"

4. **Update your frontend**
   ```javascript
   const API_URL = 'http://localhost:4040';
   ```

5. **Start inspecting**
   - Use your application normally
   - View all traffic in `http://localhost:4040/inspector/dashboard`
   - Debug issues, verify data, and monitor performance

## Troubleshooting

### DRIFT won't start

- **Check if port 4040 is already in use**: Try a different port with `-p` flag
- **Verify DRIFT has execute permissions**: Run `chmod +x drift` (Linux/macOS)

### Backend not reachable

- **Ensure your backend is running**: Check that your backend server is active
- **Verify the port number**: Make sure you entered the correct backend port
- **Check firewall settings**: Ensure localhost connections are allowed

### Dashboard not loading

- **Clear browser cache**: Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- **Check browser console**: Look for JavaScript errors
- **Try a different browser**: Test with Chrome, Firefox, or Safari

### Public URL not working

- **Install Zrok**: Make sure Zrok CLI is installed and configured
- **Check Zrok status**: Run `zrok status` to verify Zrok is working
- **Verify token**: If using custom token, ensure it's valid and not expired

## Next Steps

- Learn about all available [Commands](commands.md)
- Explore the [serve command](commands/serve.md) in detail
- Get [Support](support.md) if you encounter issues
- [Contribute](contributing.md) to DRIFT development
