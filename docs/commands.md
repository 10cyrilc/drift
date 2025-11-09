# Commands

DRIFT provides several commands to help you manage and use the API inspection tool effectively.

## Available Commands

### [serve](commands/serve.md)
Start the DRIFT server and begin intercepting API traffic.

```bash
drift serve [flags]
```

This is the main command you'll use to run DRIFT. It starts the HTTP server, sets up the reverse proxy, and launches the web dashboard.

**Common usage:**
```bash
# Start with default port (4040)
drift serve

# Start with custom port
drift serve -p 5050

# Using environment variable
DRIFT_PORT=5050 drift serve
```

[Learn more about the serve command →](commands/serve.md)

---

### [update](commands/update.md)
Check for and install the latest version of DRIFT.

```bash
drift update
```

This command automatically checks the GitHub releases for a newer version and updates DRIFT if one is available.

**Features:**
- Automatic version checking
- Downloads the latest release
- Replaces the current binary
- Preserves your configuration

[Learn more about the update command →](commands/update.md)

---

### [release](commands/release.md)
Release reserved Zrok tokens that are no longer needed.

```bash
drift release
```

When you use custom Zrok tokens for public URLs, they remain reserved even after DRIFT stops. This command helps you clean up and release those tokens.

**Features:**
- Lists all your reserved tokens
- Interactive selection
- Batch release multiple tokens
- Frees up Zrok resources

[Learn more about the release command →](commands/release.md)

---

## Global Flags

These flags work with any DRIFT command:

### `-v` - Version Information
Display the current version of DRIFT.

```bash
drift -v
```

**Output example:**
```
DRIFT version 1.0.0
```

### `-h` - Help Information
Show help information and usage instructions.

```bash
drift -h
```

**Output:**
```
DRIFT - A fast and lightweight reverse proxy for inspecting API traffic

Usage:
  drift [command]

Commands:
  serve [flags]  Start DRIFT server
    -p PORT      Port to run the server on
  update         Update DRIFT to the latest version
  release        Release a reserved zrok token
  help           Show help information

Global Flags:
  -v             Show version information
  -h             Show help information

Environment Variables:
  DRIFT_PORT     Set the server port
```

---

## Environment Variables

### `DRIFT_PORT`
Set the default port for the DRIFT server.

```bash
export DRIFT_PORT=5050
drift serve
```

!!! note "Priority Order"
    Port configuration follows this priority (highest to lowest):

    1. `-p` flag (e.g., `drift serve -p 5050`)
    2. `DRIFT_PORT` environment variable
    3. Default port (4040)

---

## Command Examples

### Basic Workflow

```bash
# 1. Start DRIFT on default port
drift serve

# 2. Configure in browser (http://localhost:4040/inspector/configure)
# 3. Start using your application
# 4. View traffic in dashboard
```

### Custom Port Workflow

```bash
# Start DRIFT on port 8080
drift serve -p 8080

# Configure in browser (http://localhost:8080/inspector/configure)
```

### Update and Run

```bash
# Update to latest version
drift update

# Verify version
drift -v

# Start server
drift serve
```

### Cleanup Zrok Tokens

```bash
# Release unused tokens
drift release

# Select tokens to release from the interactive list
```

---

## Getting Help

For detailed information about each command, click on the command links above or use the `-h` flag:

```bash
drift serve -h
drift update -h
drift release -h
```

For general help:

```bash
drift -h
drift help
```

---

## Next Steps

- [Learn more about the serve command](commands/serve.md)
- [Learn more about the update command](commands/update.md)
- [Learn more about the release command](commands/release.md)
- [Get Support](support.md)
