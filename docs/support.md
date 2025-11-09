# Support

Need help with DRIFT? We're here to assist you! This page provides various ways to get support, report issues, and find answers to common questions.

## Getting Help

### 📚 Documentation

Start with the documentation:

- **[Getting Started Guide](getting-started.md)** - Installation and basic usage
- **[Commands Reference](commands.md)** - Detailed command documentation
- **[serve Command](commands/serve.md)** - Server configuration and usage
- **[update Command](commands/update.md)** - Updating DRIFT
- **[release Command](commands/release.md)** - Managing Zrok tokens

### 🐛 Report Issues

Found a bug or have a feature request? Open an issue on GitHub:

**[Open an Issue →](https://github.com/10cyrilc/drift/issues)**

When reporting issues, please include:

1. **DRIFT version**: Run `drift -v`
2. **Operating system**: Linux, macOS, or Windows
3. **Steps to reproduce**: How to trigger the issue
4. **Expected behavior**: What should happen
5. **Actual behavior**: What actually happens
6. **Error messages**: Any error output or logs
7. **Screenshots**: If applicable

**Example issue:**
```markdown
**DRIFT Version:** 1.0.0
**OS:** macOS 13.0 (Apple Silicon)

**Description:**
Dashboard doesn't load after configuration

**Steps to Reproduce:**
1. Start DRIFT: `drift serve`
2. Configure backend port: 3000
3. Click "Start Intercepting"
4. Dashboard shows blank page

**Expected:** Dashboard should show request list
**Actual:** Blank white page

**Error in console:**
WebSocket connection failed: Connection refused
```

### 💬 Discussions

Have questions or want to discuss features? Use GitHub Discussions:

**[Join Discussions →](https://github.com/10cyrilc/drift/discussions)**

Great for:
- General questions
- Feature ideas
- Best practices
- Use case discussions
- Community help

### 📧 Direct Contact

For security issues or private matters, contact the maintainer:

**Email:** [Create an issue](https://github.com/10cyrilc/drift/issues) (preferred)

## Common Issues

### Installation Problems

#### Binary Won't Execute (Linux/macOS)

**Problem:** `Permission denied` when running DRIFT

**Solution:**
```bash
chmod +x drift
./drift serve
```

#### Binary Not Found

**Problem:** `command not found: drift`

**Solution:**
```bash
# Add to PATH or use full path
./drift serve

# Or move to PATH directory
sudo mv drift /usr/local/bin/
drift serve
```

### Server Issues

#### Port Already in Use

**Problem:** `address already in use`

**Solution:**
```bash
# Use different port
drift serve -p 5050

# Or find and kill process using port 4040
lsof -ti:4040 | xargs kill -9
```

#### Dashboard Not Loading

**Problem:** Browser shows "Connection refused"

**Solutions:**
1. Verify DRIFT is running
2. Check correct port (default: 4040)
3. Try `http://127.0.0.1:4040` instead of `localhost`
4. Clear browser cache
5. Try different browser

### Configuration Issues

#### Backend Not Reachable

**Problem:** "Backend server on port 3000 is not reachable"

**Solutions:**
1. Ensure backend is running: `curl http://localhost:3000`
2. Verify correct port number
3. Check backend logs for errors
4. Ensure backend listens on localhost

#### WebSocket Connection Failed

**Problem:** Dashboard shows "WebSocket disconnected"

**Solutions:**
1. Refresh the page
2. Check browser console for errors
3. Verify DRIFT server is running
4. Check firewall settings

### Tunneling Issues

#### Zrok Not Found

**Problem:** `zrok: command not found`

**Solution:**
```bash
# Install Zrok
# Visit: https://zrok.io/docs/getting-started/

# Verify installation
zrok version
```

#### Zrok Not Enabled

**Problem:** "Zrok is not configured"

**Solution:**
```bash
# Enable Zrok with your account token
zrok enable YOUR_ACCOUNT_TOKEN

# Verify
zrok status
```

#### Public URL Not Working

**Problem:** Public URL returns 404 or connection error

**Solutions:**
1. Verify Zrok is running: `zrok status`
2. Check DRIFT is configured and running
3. Ensure backend is accessible
4. Try releasing and recreating the token

## Frequently Asked Questions

### General Questions

**Q: Is DRIFT free to use?**
A: Yes, DRIFT is open source and completely free.

**Q: Can I use DRIFT in production?**
A: No, DRIFT is designed for development and debugging only. It logs all traffic and is not optimized for production use.

**Q: Does DRIFT work with HTTPS backends?**
A: Currently, DRIFT is designed for HTTP backends. HTTPS support may be added in future versions.

**Q: Can I inspect WebSocket traffic?**
A: DRIFT supports WebSocket connections for dashboard updates, but full WebSocket traffic inspection is not yet implemented.

### Configuration Questions

**Q: Can I change the backend port after configuration?**
A: Yes, simply reconfigure by visiting `/inspector/configure` again.

**Q: Does DRIFT store request data permanently?**
A: No, all data is stored in memory and is lost when DRIFT stops.

**Q: Can multiple people view the same dashboard?**
A: Yes, multiple browsers can connect to the same DRIFT instance and view traffic in real-time.

**Q: What's the difference between Auto and Custom Zrok modes?**
A: Auto creates temporary tokens automatically, while Custom uses reserved tokens for consistent URLs.

### Technical Questions

**Q: What port does DRIFT use by default?**
A: Port 4040, but you can change it with `-p` flag or `DRIFT_PORT` environment variable.

**Q: How much memory does DRIFT use?**
A: Memory usage depends on traffic volume. DRIFT stores logs in memory, so high traffic may increase memory usage.

**Q: Can I filter logs by time range?**
A: Currently, filtering is by method and search text. Time-based filtering may be added in future versions.

**Q: Does DRIFT modify requests or responses?**
A: No, DRIFT only logs traffic. It forwards requests and responses unchanged.

## Feature Requests

Have an idea for a new feature? We'd love to hear it!

**[Submit Feature Request →](https://github.com/10cyrilc/drift/issues/new)**

Popular feature requests:
- HTTPS backend support
- Request/response modification
- Export logs to file
- Custom filters and rules
- Request replay functionality
- Performance metrics

## Contributing

Want to contribute to DRIFT? Check out the [Contributing Guide](contributing.md).

## Community

### Stay Updated

- **GitHub**: [Watch the repository](https://github.com/10cyrilc/drift) for updates
- **Releases**: [Subscribe to releases](https://github.com/10cyrilc/drift/releases)
- **Discussions**: [Join conversations](https://github.com/10cyrilc/drift/discussions)

### Share Your Experience

Help others by sharing:
- Use cases and workflows
- Tips and tricks
- Integration examples
- Blog posts or tutorials

## Resources

### External Resources

- **[Zrok Documentation](https://zrok.io/docs/)** - Learn about Zrok tunneling
- **[Go Documentation](https://go.dev/doc/)** - For contributors
- **[Reverse Proxy Concepts](https://en.wikipedia.org/wiki/Reverse_proxy)** - Understanding proxies

### Related Tools

- **[ngrok](https://ngrok.com/)** - Alternative tunneling solution
- **[Charles Proxy](https://www.charlesproxy.com/)** - HTTP debugging proxy
- **[Postman](https://www.postman.com/)** - API testing tool
- **[Insomnia](https://insomnia.rest/)** - API client

## Response Time

- **Issues**: We aim to respond within 48 hours
- **Pull Requests**: Reviewed within 1 week
- **Discussions**: Community-driven, responses vary

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to learn and build better tools together.

---

**Still need help?** [Open an issue](https://github.com/10cyrilc/drift/issues) and we'll assist you!
