# update

The `update` command checks for a new version of DRIFT and automatically updates it if a newer version is available.

## Usage

```bash
drift update
```

## Description

The `update` command provides an easy way to keep DRIFT up-to-date with the latest features, bug fixes, and improvements. It automatically:

1. **Checks GitHub releases** for the latest version
2. **Compares versions** with your current installation
3. **Downloads the new binary** if an update is available
4. **Replaces the old binary** with the new one
5. **Preserves permissions** and configuration

## How It Works

### Update Process

```
┌─────────────────────────────────────┐
│  1. Check Current Version           │
│     - Read local version            │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  2. Fetch Latest Release            │
│     - Query GitHub API              │
│     - Get latest version tag        │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  3. Compare Versions                │
│     - Is update available?          │
└─────────────────────────────────────┘
         ↓
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    ↓         ↓
┌─────┐  ┌──────────────────┐
│Update│  │Already up-to-date│
└─────┘  └──────────────────┘
    ↓
┌─────────────────────────────────────┐
│  4. Download New Binary             │
│     - Detect OS and architecture    │
│     - Download appropriate release  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  5. Replace Binary                  │
│     - Backup old version            │
│     - Install new version           │
│     - Set permissions               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  6. Verify Installation             │
│     - Check new version             │
│     - Confirm success               │
└─────────────────────────────────────┘
```

## Examples

### Check and Update

Simply run the update command:

```bash
drift update
```

**Output when update is available:**
```
Checking for updates...
Current version: 1.0.0
Latest version: 1.1.0
Downloading update...
Update successful! DRIFT has been updated to version 1.1.0
```

**Output when already up-to-date:**
```
Checking for updates...
Current version: 1.1.0
Latest version: 1.1.0
DRIFT is already up-to-date!
```

### Verify Version After Update

```bash
# Update DRIFT
drift update

# Check the new version
drift -v
```

**Output:**
```
DRIFT version 1.1.0
```

## Features

### Automatic Platform Detection
The update command automatically detects your operating system and architecture:
- **Linux**: amd64, arm64
- **macOS**: amd64 (Intel), arm64 (Apple Silicon)
- **Windows**: amd64

### Safe Updates
- **Backup creation**: Old binary is backed up before replacement
- **Atomic replacement**: Update happens in one operation
- **Permission preservation**: File permissions are maintained
- **Rollback capability**: Can revert if needed

### No Configuration Loss
- Settings are preserved
- No need to reconfigure
- Seamless transition

## Update Frequency

### When to Update

**Recommended:**
- When new features are announced
- After bug fixes are released
- Monthly check for updates
- Before starting a new project

**Check for updates:**
```bash
# Quick check
drift update
```

### Release Channels

DRIFT follows semantic versioning (SemVer):

- **Major versions** (e.g., 1.0.0 → 2.0.0): Breaking changes
- **Minor versions** (e.g., 1.0.0 → 1.1.0): New features, backward compatible
- **Patch versions** (e.g., 1.0.0 → 1.0.1): Bug fixes, backward compatible

## Troubleshooting

### Update Fails to Download

**Error:**
```
Failed to download update: connection timeout
```

**Solutions:**
1. Check internet connection
2. Verify GitHub is accessible
3. Check firewall settings
4. Try again later

### Permission Denied

**Error:**
```
Failed to replace binary: permission denied
```

**Solutions:**
```bash
# Linux/macOS: Run with sudo
sudo drift update

# Or change ownership
sudo chown $USER /path/to/drift
drift update
```

### Binary Not Found After Update

**Problem:** Command not found after update

**Solutions:**
1. Check if binary is still in PATH
2. Verify installation location
3. Re-download from releases page if needed

### Version Mismatch

**Problem:** `drift -v` shows old version after update

**Solutions:**
```bash
# Clear shell cache
hash -r

# Or restart terminal
exit
# Open new terminal
drift -v
```

## Manual Update Alternative

If the automatic update fails, you can manually update:

1. **Download the latest release**
   ```bash
   # Visit GitHub releases
   https://github.com/10cyrilc/drift/releases/latest
   ```

2. **Extract the archive**
   ```bash
   tar -xzf drift-linux-amd64.tar.gz
   ```

3. **Replace the binary**
   ```bash
   # Backup old version
   mv drift drift.backup

   # Move new version
   mv drift-new drift

   # Set permissions
   chmod +x drift
   ```

4. **Verify installation**
   ```bash
   drift -v
   ```

## Best Practices

### Regular Updates

Create a habit of checking for updates:

```bash
# Weekly check
drift update

# Before important work
drift update && drift serve
```

### Test After Update

After updating, verify everything works:

```bash
# 1. Check version
drift -v

# 2. Test server start
drift serve -p 5050

# 3. Verify dashboard loads
# Open http://localhost:5050/inspector/configure

# 4. Test basic functionality
# Configure backend and inspect a request
```

### Keep Release Notes

Stay informed about changes:
- Read release notes on GitHub
- Check for breaking changes
- Review new features
- Note deprecated functionality

## Security Considerations

### Verify Source

The update command downloads from:
```
https://github.com/10cyrilc/drift/releases
```

Always ensure you're updating from the official repository.

### Checksum Verification

For extra security, manually verify checksums:

```bash
# Download checksum file
curl -L https://github.com/10cyrilc/drift/releases/download/v1.1.0/checksums.txt

# Verify binary
sha256sum drift
```

## Related Commands

- [serve](serve.md) - Start the DRIFT server
- [release](release.md) - Release reserved Zrok tokens

## See Also

- [Getting Started Guide](../getting-started.md)
- [Commands Overview](../commands.md)
- [GitHub Releases](https://github.com/10cyrilc/drift/releases)
- [Support](../support.md)
