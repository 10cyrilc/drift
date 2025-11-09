# release

The `release` command releases reserved Zrok tokens that are no longer needed, freeing up resources and cleaning up your Zrok account.

## Usage

```bash
drift release
```

## Description

When you use DRIFT with custom Zrok tokens for public URL tunneling, those tokens remain reserved in your Zrok account even after DRIFT stops. The `release` command helps you manage and clean up these reserved tokens.

### What are Zrok Tokens?

Zrok tokens are reserved public URLs that you can use consistently across sessions. When you reserve a token, Zrok allocates a specific URL (e.g., `https://abc123.share.zrok.io`) that remains yours until you release it.

### Why Release Tokens?

- **Free up resources**: Zrok accounts have limits on reserved tokens
- **Clean up unused tokens**: Remove tokens from old projects
- **Manage token inventory**: Keep track of active tokens
- **Prevent clutter**: Maintain an organized Zrok account

## How It Works

### Interactive Selection

When you run `drift release`, you'll see an interactive list of all your reserved tokens:

```
┌─────────────────────────────────────┐
│  1. Fetch Reserved Tokens           │
│     - Query Zrok API                │
│     - List all reserved tokens      │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  2. Display Token List              │
│     - Show token names              │
│     - Show URLs                     │
│     - Show creation dates           │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  3. User Selection                  │
│     - Select tokens to release      │
│     - Confirm selection             │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  4. Release Tokens                  │
│     - Call Zrok release API         │
│     - Remove tokens                 │
│     - Show confirmation             │
└─────────────────────────────────────┘
```

## Examples

### Basic Usage

Release tokens interactively:

```bash
drift release
```

**Output:**
```
Fetching reserved Zrok tokens...

Reserved Tokens:
1. abc123 - https://abc123.share.zrok.io (Created: 2024-01-15)
2. def456 - https://def456.share.zrok.io (Created: 2024-01-10)
3. ghi789 - https://ghi789.share.zrok.io (Created: 2024-01-05)

Select tokens to release (comma-separated, e.g., 1,3):
```

### Release Single Token

```bash
drift release
# Enter: 1
```

**Output:**
```
Releasing token abc123...
✓ Token abc123 released successfully
```

### Release Multiple Tokens

```bash
drift release
# Enter: 1,3
```

**Output:**
```
Releasing token abc123...
✓ Token abc123 released successfully

Releasing token ghi789...
✓ Token ghi789 released successfully

2 tokens released successfully!
```

### No Tokens Available

```bash
drift release
```

**Output:**
```
Fetching reserved Zrok tokens...
No reserved tokens found.
```

## Token Management Workflow

### Reserving Tokens

Before you can release tokens, you need to reserve them using the Zrok CLI:

```bash
# Reserve a token for DRIFT
zrok reserve public --backend-mode proxy 4040
```

**Output:**
```
Reserved token: abc123
Public URL: https://abc123.share.zrok.io
```

### Using Tokens in DRIFT

1. Start DRIFT:
   ```bash
   drift serve
   ```

2. Configure with custom token:
   - Open `http://localhost:4040/inspector/configure`
   - Select "Custom" tunneling option
   - Enter token: `abc123`
   - Click "Start Intercepting"

3. DRIFT uses the reserved URL:
   ```
   Public URL: https://abc123.share.zrok.io
   ```

### Automatic Release

DRIFT automatically releases tokens when you stop the server (Ctrl+C), but only for tokens created during that session. Custom tokens you reserved manually remain active.

### Manual Release

Use `drift release` to clean up custom tokens:

```bash
drift release
# Select the tokens you want to release
```

## Features

### Interactive Selection
- User-friendly interface
- Clear token information
- Multi-select capability
- Confirmation before release

### Batch Operations
- Release multiple tokens at once
- Efficient cleanup
- Progress feedback

### Safe Operations
- Shows token details before release
- Requires explicit confirmation
- Error handling for failed releases

## Troubleshooting

### Zrok Not Installed

**Error:**
```
Zrok command not found
```

**Solution:**
```bash
# Install Zrok
# Visit: https://zrok.io/docs/getting-started/

# Verify installation
zrok version
```

### Zrok Not Configured

**Error:**
```
Zrok is not configured. Please run 'zrok enable' first.
```

**Solution:**
```bash
# Enable Zrok with your account token
zrok enable YOUR_ACCOUNT_TOKEN

# Verify configuration
zrok status
```

### No Tokens Found

**Message:**
```
No reserved tokens found.
```

**Explanation:**
- You haven't reserved any tokens yet
- All tokens have already been released
- Zrok account is empty

**Solution:**
```bash
# Reserve a new token
zrok reserve public --backend-mode proxy 4040
```

### Release Failed

**Error:**
```
Failed to release token abc123: token not found
```

**Possible causes:**
1. Token was already released
2. Token doesn't exist
3. Network connectivity issue
4. Zrok service unavailable

**Solution:**
```bash
# Verify token exists
zrok status

# Try again
drift release
```

## Best Practices

### Regular Cleanup

Periodically clean up unused tokens:

```bash
# Monthly cleanup
drift release
# Review and release old tokens
```

### Token Naming

When reserving tokens, use descriptive names:

```bash
# Good: Descriptive name
zrok reserve public --backend-mode proxy 4040 --name "project-api-dev"

# Less helpful: Generic name
zrok reserve public --backend-mode proxy 4040
```

### Track Token Usage

Keep a record of which tokens are used for which projects:

```
Project A: abc123 (https://abc123.share.zrok.io)
Project B: def456 (https://def456.share.zrok.io)
Testing:   ghi789 (https://ghi789.share.zrok.io)
```

### Release When Done

Release tokens immediately when a project is complete:

```bash
# Project finished
drift release
# Select and release project tokens
```

## Zrok Token Limits

Different Zrok account tiers have different limits:

- **Free tier**: Limited number of reserved tokens
- **Paid tiers**: Higher limits

Check your account limits:
```bash
zrok status
```

## Security Considerations

### Token Privacy

- Tokens are tied to your Zrok account
- Anyone with the token URL can access your service
- Release tokens when no longer needed

### Access Control

- Released tokens become immediately unavailable
- URLs stop working after release
- No way to recover released tokens

### Best Practices

1. **Don't share tokens publicly**: Keep token URLs private
2. **Release after use**: Clean up when done
3. **Monitor active tokens**: Regularly review reserved tokens
4. **Use temporary tokens**: For short-term testing, use auto mode

## Alternative: Auto Mode

If you don't need consistent URLs, use auto mode instead:

**Benefits:**
- No manual token management
- Automatic cleanup
- No token limits concern
- Simpler workflow

**Usage:**
1. Start DRIFT: `drift serve`
2. Configure with "Auto" tunneling option
3. DRIFT creates and manages tokens automatically
4. Tokens are released when DRIFT stops

## Related Commands

- [serve](serve.md) - Start the DRIFT server with tunneling
- [update](update.md) - Update DRIFT to the latest version

## See Also

- [Getting Started Guide](../getting-started.md) - Learn about Zrok integration
- [Commands Overview](../commands.md)
- [Zrok Documentation](https://zrok.io/docs/)
- [Support](../support.md)
