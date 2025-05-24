package proxy

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"api-interceptor/internal/logging"
	"api-interceptor/internal/models"
)

// Setup configures a new reverse proxy
func Setup(port string, state *models.AppState) (*models.ProxyConfig, error) {
	backendURL, err := url.Parse(fmt.Sprintf("http://localhost:%s", port))
	if err != nil {
		return nil, fmt.Errorf("invalid port: %w", err)
	}

	// Check if backend is reachable
	resp, err := http.Get(backendURL.String())
	if err != nil {
		return nil, fmt.Errorf("backend server on port %s is not reachable: %w", port, err)
	}
	if resp.StatusCode >= 400 {
		resp.Body.Close()
		return nil, fmt.Errorf("backend server on port %s returned status %d", port, resp.StatusCode)
	}
	resp.Body.Close()

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
			resp, err := http.Get(backendURL.String())
			state.StatusMu.Lock()
			if err != nil || resp.StatusCode >= 400 {
				state.ServerStatus = "Inactive"
			} else {
				state.ServerStatus = "Active"
			}
			state.StatusMu.Unlock()
			if resp != nil {
				resp.Body.Close()
			}
			time.Sleep(5 * time.Second)
		}
	}()
}
