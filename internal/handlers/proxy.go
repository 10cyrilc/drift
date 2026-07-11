package handlers

import (
	"embed"
	"fmt"
	"net/http"
	"strings"

	"drift/internal/models"
	"drift/internal/proxy"
	"drift/internal/tunnel"
)

// ConfigureProxy handles the proxy configuration request
func ConfigureProxy(state *models.AppState, proxyPort string) http.HandlerFunc {
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

		// Handle zrok options
		zrokOption := r.FormValue("zrok_option")

		state.ConfigMu.Lock()
		existingToken := ""
		existingURL := ""
		existingUniqueName := ""
		existingOption := ""
		if state.Config != nil && state.Config.ZrokToken != "" && state.Config.ZrokPort == proxyPort {
			existingToken = state.Config.ZrokToken
			existingURL = state.Config.ZrokURL
			existingUniqueName = state.Config.ZrokUniqueName
			existingOption = state.Config.ZrokOption
		}
		state.ConfigMu.Unlock()

		if zrokOption == "custom" {
			// Use user-provided token
			token := r.FormValue("zrok_token")
			tokenPort := r.FormValue("zrok_port")
			if token != "" && tokenPort != "" {
				config.ZrokToken = token
				config.ZrokPort = tokenPort
				config.ZrokUniqueName = ""
				config.ZrokOption = "custom"

				// Warn if the port doesn't match
				if tokenPort != proxyPort {
					fmt.Printf("Warning: Using token for port %s with current proxy port %s\n", tokenPort, proxyPort)
				}
			}
		} else if zrokOption == "reserve" {
			// Reserve mode
			uniqueName := r.FormValue("zrok_unique_name")
			token, url, err := tunnel.ReserveZrokToken(proxyPort, uniqueName)
			if err != nil {
				fmt.Printf("Failed to reserve zrok token: %v\n", err)
			} else {
				config.ZrokToken = token
				config.ZrokURL = url
				config.ZrokPort = proxyPort
				config.ZrokUniqueName = uniqueName
				config.ZrokOption = "reserve"
				fmt.Printf("Reserved new zrok token: %s for port %s, URL: %s\n", token, proxyPort, url)
			}
		} else {
			// Auto mode: use existing token or create new random one
			if existingToken != "" {
				// Reuse existing token for this port
				fmt.Printf("Reusing existing zrok token: %s for port %s\n", existingToken, proxyPort)
				config.ZrokToken = existingToken
				config.ZrokURL = existingURL
				config.ZrokPort = proxyPort
				config.ZrokUniqueName = existingUniqueName
				config.ZrokOption = existingOption
			} else {
				// Create a new random token
				token, url, err := tunnel.ReserveZrokToken(proxyPort, "")
				if err != nil {
					fmt.Printf("Failed to reserve random zrok token: %v\n", err)
				} else {
					config.ZrokToken = token
					config.ZrokURL = url
					config.ZrokPort = proxyPort
					config.ZrokUniqueName = ""
					config.ZrokOption = "auto"
					fmt.Printf("Reserved new random zrok token: %s for port %s, URL: %s\n", token, proxyPort, url)
				}
			}
		}

		state.ConfigMu.Lock()
		state.Config = config
		state.ConfigMu.Unlock()

		state.ZrokMu.Lock()
		state.ZrokURL = "Initializing Zrok tunnel..."
		state.ZrokMu.Unlock()

		proxy.MonitorBackend(config.BackendURL, state)

		// Start zrok in a separate goroutine
		go tunnel.StartZrok(state, proxyPort)

		http.Redirect(w, r, "/inspector/dashboard", http.StatusSeeOther)
	}
}

// HandleHTTPRequest handles all HTTP requests
func HandleHTTPRequest(state *models.AppState, staticFiles embed.FS) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Handle inspector routes - only allow from localhost
		if strings.HasPrefix(path, "/inspector/") {
			host := r.Host
			isLocalhost := strings.HasPrefix(host, "localhost:")

			if !isLocalhost {
				// Not localhost - forward to proxy
				state.ConfigMu.Lock()
				if state.Config == nil || state.Config.Proxy == nil {
					state.ConfigMu.Unlock()
					http.Error(w, "Proxy not configured", http.StatusServiceUnavailable)
					return
				}
				proxy := state.Config.Proxy
				state.ConfigMu.Unlock()
				proxy.ServeHTTP(w, r)
				return
			}

			// Continue with normal inspector handling for localhost
			if path == "/inspector/configure" || path == "/inspector/configure/" {
				http.ServeFileFS(w, r, staticFiles, "static/configure/index.html")
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

// EnableZrok handles the programmatic zrok environment enablement request
func EnableZrok(state *models.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		token := r.FormValue("token")
		if token == "" {
			http.Error(w, "Token is required", http.StatusBadRequest)
			return
		}

		fmt.Println("Enabling zrok environment programmatically using SDK...")
		if err := tunnel.EnableZrokEnvironment(token); err != nil {
			fmt.Printf("Failed to enable zrok environment: %v\n", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		fmt.Println("Zrok environment enabled successfully")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Zrok environment enabled successfully"))
	}
}
