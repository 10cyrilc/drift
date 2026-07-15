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

1. **Enable Zrok Environment** (first-time setup only) - If your local zrok environment is not enabled, paste your account enable token into the enablement card. DRIFT will enable it programmatically.
2. **Enter your backend port** - The port where your actual backend server is running (e.g., 3000, 8080)
3. **Choose tunneling option**:
   - **Automatic**: Automatically generates a dynamic, random public URL.
   - **Reserve Name**: Expose under a persistent human-readable name of your choice (e.g., `https://my-drift.shares.zrok.io`).
   - **Use Token**: Bind to a specific manually reserved token or name.

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

DRIFT integrates a native Go implementation of the [zrok Go SDK](https://zrok.io/) directly into the binary to generate public URLs. **No external CLI binary installation or PATH configuration is required.**

### Programmatic Enablement
If you have not set up zrok, you can paste your enable token in the DRIFT dashboard configuration card. DRIFT automatically contacts the zrok controller and enables the environment.

### Automatic Mode
Generates a new random URL on the fly. 

### Reserve Name Mode
Exposes your API under a custom human-readable name (e.g., `my-drift-share` -> `https://my-drift-share.shares.zrok.io`). The name remains persistent in your account.

### Use Token Mode
Lets you bind to any existing reserved name or token.

!!! tip "Interactive Clean Cleanup"
    When you stop the server using `Ctrl + C` in your terminal, DRIFT asks if you would like to release the reserved name:
    ```
    Do you want to release the zrok token 'my-drift-share'? (y/N): 
    ```
    Pressing `y`/`yes` deletes the name reservation, while pressing Enter or `n` keeps the name reserved on your zrok account.

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

- **Check Enablement status**: Verify you have pasted your zrok account token to enable the environment.
- **Controller Connectivity**: Ensure your local machine has internet access and can connect to `api.zrok.io` (or your custom controller API endpoint).
- **Name Collisions**: If you are using "Reserve Name" and the name is already taken by another account, the creation will fail. Try another name.

## Next Steps

- Learn about all available [Commands](commands.md)
- Explore the [serve command](commands/serve.md) in detail
- Get [Support](support.md) if you encounter issues
- [Contribute](contributing.md) to DRIFT development
