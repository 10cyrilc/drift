package proxy

import (
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"drift/internal/logging"
	"drift/internal/models"
)

// Setup configures a new reverse proxy
func Setup(port string, state *models.AppState) (*models.ProxyConfig, error) {
	backendURL, err := url.Parse(fmt.Sprintf("http://localhost:%s", port))
	if err != nil {
		return nil, fmt.Errorf("invalid port: %w", err)
	}

	// Check if backend port is open rather than pinging a specific endpoint
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("localhost:%s", port), 2*time.Second)
	if err != nil {
		return nil, fmt.Errorf("backend server on port %s is not reachable: %w", port, err)
	}
	conn.Close()

	// Create reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(backendURL)
	proxy.Transport = logging.NewTransport(http.DefaultTransport, state.LogChan)

	config := &models.ProxyConfig{
		BackendURL:  backendURL,
		Proxy:       proxy,
		BackendPort: port,
	}

	return config, nil
}

// MonitorBackend continuously checks if the backend is available
func MonitorBackend(backendURL *url.URL, state *models.AppState) {
	go func() {
		for {
			// Extract port from backendURL
			port := backendURL.Port()
			if port == "" {
				if backendURL.Scheme == "https" {
					port = "443"
				} else {
					port = "80"
				}
			}

			// Check if port is open
			conn, err := net.DialTimeout("tcp", fmt.Sprintf("localhost:%s", port), 2*time.Second)
			state.StatusMu.Lock()
			if err != nil {
				state.ServerStatus = "Inactive"
			} else {
				conn.Close()
				state.ServerStatus = "Active"
			}
			state.StatusMu.Unlock()

			time.Sleep(5 * time.Second)
		}
	}()
}
