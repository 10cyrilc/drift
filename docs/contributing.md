# Contributing

Thank you for your interest in contributing to DRIFT! We welcome contributions from the community and appreciate your help in making DRIFT better.

## Ways to Contribute

There are many ways to contribute to DRIFT:

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Share ideas for improvements
- 📝 **Improve documentation** - Help others understand DRIFT better
- 💻 **Submit code** - Fix bugs or implement new features
- 🧪 **Write tests** - Improve code quality and reliability
- 🎨 **Improve UI/UX** - Enhance the dashboard experience
- 🌍 **Spread the word** - Share DRIFT with others

## Getting Started

### 1. Fork the Repository

Visit the [DRIFT repository](https://github.com/10cyrilc/drift) and click the "Fork" button.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/drift.git
cd drift
```

### 3. Set Up Development Environment

**Requirements:**
- Go 1.21 or higher
- Git
- A code editor (VS Code, GoLand, etc.)

**Install dependencies:**
```bash
go mod download
```

### 4. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates

## Development Workflow

### Project Structure

```
drift/
├── internal/
│   ├── config/       # Configuration management
│   ├── handlers/     # HTTP handlers (proxy, WebSocket, status)
│   ├── logging/      # Request/response logging
│   ├── models/       # Data structures
│   ├── proxy/        # Reverse proxy logic
│   ├── server/       # HTTP server setup
│   ├── tunnel/       # Zrok integration
│   └── cmd/          # CLI commands
├── static/           # Web dashboard files
│   ├── analytics/    # Analytics dashboard
│   ├── dashboard/    # Main inspector dashboard
│   └── landing/      # Configuration page
├── docs/             # Documentation
├── main.go           # Application entry point
├── go.mod            # Go module definition
└── README.md         # Project README
```

### Building DRIFT

```bash
# Build the application
go build

# Run the built binary
./drift serve
```

### Running Tests

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with verbose output
go test -v ./...
```

### Code Style

DRIFT follows standard Go conventions:

```bash
# Format code
go fmt ./...

# Run linter
go vet ./...

# Use golangci-lint (recommended)
golangci-lint run
```

## Making Changes

### 1. Write Clean Code

- Follow Go best practices
- Write clear, self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable names

**Example:**
```go
// Good
func validateBackendPort(port string) error {
    if port == "" {
        return errors.New("port cannot be empty")
    }
    // Validation logic...
}

// Less clear
func vp(p string) error {
    if p == "" {
        return errors.New("err")
    }
    // ...
}
```

### 2. Add Tests

Write tests for new features and bug fixes:

```go
func TestValidateBackendPort(t *testing.T) {
    tests := []struct {
        name    string
        port    string
        wantErr bool
    }{
        {"valid port", "3000", false},
        {"empty port", "", true},
        {"invalid port", "abc", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validateBackendPort(tt.port)
            if (err != nil) != tt.wantErr {
                t.Errorf("validateBackendPort() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### 3. Update Documentation

If your changes affect user-facing functionality:

- Update relevant documentation files in `docs/`
- Update README.md if needed
- Add code comments for complex logic
- Update help text in CLI commands

### 4. Test Your Changes

Before submitting:

```bash
# 1. Build the project
go build

# 2. Run tests
go test ./...

# 3. Test manually
./drift serve
# Test the feature in browser

# 4. Check for issues
go vet ./...
go fmt ./...
```

## Submitting Changes

### 1. Commit Your Changes

Write clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "Add request filtering by status code"
git commit -m "Fix WebSocket connection timeout issue"
git commit -m "Update documentation for serve command"

# Less helpful
git commit -m "Update code"
git commit -m "Fix bug"
git commit -m "Changes"
```

**Commit message format:**
```
<type>: <short description>

<optional detailed description>

<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or updates
- `chore`: Maintenance tasks

**Example:**
```
feat: Add request filtering by status code

Implement filtering functionality in the dashboard to allow
users to filter requests by HTTP status code (2xx, 3xx, 4xx, 5xx).

Closes #42
```

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create a Pull Request

1. Go to the [DRIFT repository](https://github.com/10cyrilc/drift)
2. Click "Pull Requests" → "New Pull Request"
3. Select your fork and branch
4. Fill in the PR template:
   - **Title**: Clear, descriptive title
   - **Description**: What changes were made and why
   - **Related Issues**: Link to related issues
   - **Testing**: How you tested the changes
   - **Screenshots**: If UI changes

**Example PR description:**
```markdown
## Description
Adds request filtering by HTTP status code in the dashboard.

## Changes
- Added status code filter dropdown
- Implemented filtering logic in JavaScript
- Updated dashboard UI to show filter controls

## Related Issues
Closes #42

## Testing
- Tested with various status codes (200, 404, 500)
- Verified filter persists across page refreshes
- Tested with large number of requests

## Screenshots
[Screenshot of new filter UI]
```

### 4. Code Review

- Respond to feedback promptly
- Make requested changes
- Push updates to the same branch
- Be open to suggestions

## Contribution Guidelines

### Code Quality

- **Write tests**: Aim for good test coverage
- **Follow conventions**: Use Go best practices
- **Keep it simple**: Avoid over-engineering
- **Document code**: Add comments where needed
- **Handle errors**: Proper error handling and logging

### Pull Request Guidelines

- **One feature per PR**: Keep PRs focused
- **Small PRs**: Easier to review and merge
- **Update docs**: Include documentation updates
- **Pass tests**: Ensure all tests pass
- **No merge conflicts**: Rebase if needed

### Communication

- **Be respectful**: Treat everyone with respect
- **Be patient**: Reviews take time
- **Be constructive**: Provide helpful feedback
- **Ask questions**: Don't hesitate to ask for clarification

## Areas for Contribution

### High Priority

- 🔒 **HTTPS backend support** - Support for HTTPS backends
- 📊 **Export functionality** - Export logs to JSON/CSV
- 🔍 **Advanced filtering** - More filter options
- ⚡ **Performance improvements** - Optimize for high traffic
- 🧪 **Test coverage** - Increase test coverage

### Good First Issues

Looking for a place to start? Check issues labeled `good first issue`:

**[View Good First Issues →](https://github.com/10cyrilc/drift/labels/good%20first%20issue)**

### Documentation

- Improve existing documentation
- Add more examples
- Create tutorials
- Fix typos and errors
- Add diagrams and visuals

### UI/UX Improvements

- Enhance dashboard design
- Improve mobile responsiveness
- Add dark/light theme toggle
- Better error messages
- Accessibility improvements

## Development Tips

### Hot Reload

For faster development, use a tool like `air` for hot reloading:

```bash
# Install air
go install github.com/cosmtrek/air@latest

# Run with hot reload
air
```

### Debugging

Use Go's debugging tools:

```bash
# Run with race detector
go run -race main.go

# Use delve debugger
dlv debug
```

### Testing Locally

Test with a real backend:

```bash
# Terminal 1: Start a simple backend
python3 -m http.server 3000

# Terminal 2: Start DRIFT
./drift serve

# Terminal 3: Make requests
curl http://localhost:4040
```

## Release Process

Releases are managed by maintainers:

1. Version bump in code
2. Update CHANGELOG
3. Create Git tag
4. Build binaries for all platforms
5. Create GitHub release
6. Update documentation

## Getting Help

Need help with your contribution?

- **Ask in PR comments**: Tag maintainers
- **Open a discussion**: [GitHub Discussions](https://github.com/10cyrilc/drift/discussions)
- **Check documentation**: Review existing docs
- **Look at examples**: Check existing code

## Recognition

Contributors are recognized in:

- GitHub contributors list
- Release notes
- README acknowledgments

## License

By contributing to DRIFT, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to DRIFT!** 🎉

Every contribution, no matter how small, helps make DRIFT better for everyone.

**[Start Contributing →](https://github.com/10cyrilc/drift)**
