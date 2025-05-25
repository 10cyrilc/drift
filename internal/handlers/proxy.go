package handlers

import (
	"embed"
	"fmt"
	"net/http"
	"strings"

	"api-interceptor/internal/models"
	"api-interceptor/internal/proxy"
	"api-interceptor/internal/tunnel"
)

// ConfigureProxy handles the proxy configuration request
func ConfigureProxy(state *models.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		port := r.FormValue("port")
		if port == "" {
			http.Error(w, "Port is required", http.StatusBadRequest)
			return
		}

		config, err := proxy.Setup(port, state)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		state.ConfigMu.Lock()
		state.Config = config
		state.ConfigMu.Unlock()

		state.ZrokMu.Lock()
		state.ZrokURL = "Initializing Zrok tunnel..."
		state.ZrokMu.Unlock()

		proxy.MonitorBackend(config.BackendURL, state)

		// Start zrok in a separate goroutine
		go tunnel.StartZrok(state, "4040")

		http.Redirect(w, r, "/inspector/dashboard", http.StatusSeeOther)
	}
}

// HandleHTTPRequest handles all HTTP requests
func HandleHTTPRequest(state *models.AppState, staticFiles embed.FS) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		isInspectorRoute := path == "/inspector/configure" || path == "/inspector/configure/" ||
			path == "/inspector/dashboard" || path == "/inspector/dashboard/" ||
			path == "/inspector/analytics" || path == "/inspector/analytics/"
		if isInspectorRoute {
			host := r.Host
			if !strings.Contains(host, "localhost") && !strings.Contains(host, "127.0.0.1") && !strings.Contains(host, "[::1]") {
				http.Error(w, "Inspector is only accessible from localhost", http.StatusForbidden)
				return
			}
			if path == "/inspector/configure" || path == "/inspector/configure/" {
				http.ServeFileFS(w, r, staticFiles, "static/landing/index.html")
			} else if path == "/inspector/analytics" || path == "/inspector/analytics/" {
				http.ServeFileFS(w, r, staticFiles, "static/analytics/index.html")
			} else {
				http.ServeFileFS(w, r, staticFiles, "static/dashboard/index.html")
			}
			return
		}

		if strings.HasPrefix(path, "/static/") {
			filePath := strings.TrimPrefix(path, "/static/")
			if _, err := staticFiles.Open("static/" + filePath); err == nil {
				http.ServeFileFS(w, r, staticFiles, "static/"+filePath)
			} else {
				fmt.Printf("Static file not found: %s\n", filePath)
				http.NotFound(w, r)
			}
			return
		}

		state.ConfigMu.Lock()
		if state.Config == nil || state.Config.Proxy == nil {
			state.ConfigMu.Unlock()
			http.Error(w, "Proxy not configured", http.StatusServiceUnavailable)
			return
		}
		proxy := state.Config.Proxy
		state.ConfigMu.Unlock()
		proxy.ServeHTTP(w, r)
	}
}
