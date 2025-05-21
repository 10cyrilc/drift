package main

import (
	"bufio"
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

//go:embed static/*
var staticFiles embed.FS

type RequestLog struct {
	ID        string            `json:"id"`
	Method    string            `json:"method"`
	URL       string            `json:"url"`
	Headers   map[string]string `json:"headers"`
	Body      string            `json:"body"`
	Timestamp string            `json:"timestamp"`
	ClientIP  string            `json:"client_ip"`
	UserAgent string            `json:"user_agent"`
}

type ResponseLog struct {
	ID         string            `json:"id"`
	StatusCode int               `json:"status_code"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	Timestamp  string            `json:"timestamp"`
}

type APILog struct {
	Request  RequestLog  `json:"request"`
	Response ResponseLog `json:"response"`
}

type ProxyConfig struct {
	BackendURL  *url.URL
	Proxy       *httputil.ReverseProxy
	BackendPort string
}

type LoggingTransport struct {
	http.RoundTripper
	logChan chan APILog
}

var (
	clients      = make(map[*websocket.Conn]bool)
	clientsMu    sync.Mutex
	logChan      = make(chan APILog, 100)
	config       *ProxyConfig
	configMu     sync.Mutex
	zrokURL      string
	zrokMu       sync.Mutex
	serverStatus string
	statusMu     sync.Mutex
	zrokCmd      *exec.Cmd
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (t *LoggingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	reqLog := RequestLog{
		ID:        uuid.New().String(),
		Method:    req.Method,
		URL:       req.URL.String(),
		Headers:   make(map[string]string),
		Timestamp: time.Now().Format(time.RFC3339),
		ClientIP:  req.RemoteAddr,
		UserAgent: req.Header.Get("User-Agent"),
	}

	for key, values := range req.Header {
		if len(values) > 0 {
			reqLog.Headers[key] = values[0]
		}
	}

	var reqBody []byte
	if req.Body != nil {
		reqBody, _ = io.ReadAll(req.Body)
		reqLog.Body = string(reqBody)
		req.Body = io.NopCloser(bytes.NewReader(reqBody))
	}

	resp, err := t.RoundTripper.RoundTrip(req)
	if err != nil {
		return nil, err
	}

	respLog := ResponseLog{
		ID:         reqLog.ID,
		StatusCode: resp.StatusCode,
		Headers:    make(map[string]string),
		Timestamp:  time.Now().Format(time.RFC3339),
	}

	for key, values := range resp.Header {
		if len(values) > 0 {
			respLog.Headers[key] = values[0]
		}
	}

	var respBody []byte
	if resp.Body != nil {
		respBody, _ = io.ReadAll(resp.Body)
		respLog.Body = string(respBody)
		resp.Body = io.NopCloser(bytes.NewReader(respBody))
	}

	apiLog := APILog{Request: reqLog, Response: respLog}
	t.logChan <- apiLog

	return resp, nil
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("WebSocket upgrade error: %v\n", err)
		return
	}

	conn.SetPongHandler(func(appData string) error {
		return nil
	})

	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			clientsMu.Lock()
			if _, ok := clients[conn]; !ok {
				clientsMu.Unlock()
				return
			}
			err := conn.WriteMessage(websocket.PingMessage, nil)
			if err != nil {
				conn.Close()
				delete(clients, conn)
				clientsMu.Unlock()
				return
			}
			clientsMu.Unlock()
		}
	}()

	defer func() {
		clientsMu.Lock()
		delete(clients, conn)
		clientsMu.Unlock()
		conn.Close()
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func broadcastLogs() {
	for logEntry := range logChan {
		logJSON, err := json.Marshal(logEntry)
		if err != nil {
			fmt.Printf("Error marshaling log: %v\n", err)
			continue
		}

		clientsMu.Lock()
		for client := range clients {
			err := client.WriteMessage(websocket.TextMessage, logJSON)
			if err != nil {
				client.Close()
				delete(clients, client)
			}
		}
		clientsMu.Unlock()
	}
}

func configureProxy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	port := r.FormValue("port")
	if port == "" {
		http.Error(w, "Port is required", http.StatusBadRequest)
		return
	}

	backendURL, err := url.Parse(fmt.Sprintf("http://localhost:%s", port))
	if err != nil {
		http.Error(w, "Invalid port", http.StatusBadRequest)
		return
	}

	resp, err := http.Get(backendURL.String())
	if err != nil || resp.StatusCode >= 400 {
		http.Error(w, fmt.Sprintf("Backend server on port %s is not reachable", port), http.StatusBadRequest)
		if resp != nil {
			resp.Body.Close()
		}
		return
	}
	resp.Body.Close()

	configMu.Lock()
	config = &ProxyConfig{
		BackendURL:  backendURL,
		Proxy:       httputil.NewSingleHostReverseProxy(backendURL),
		BackendPort: port,
	}
	config.Proxy.Transport = &LoggingTransport{http.DefaultTransport, logChan}
	configMu.Unlock()

	zrokMu.Lock()
	zrokURL = "Initializing Zrok tunnel..."
	zrokMu.Unlock()

	updateServerStatus(backendURL)

	go startZrok()

	http.Redirect(w, r, "/inspector/dashboard", http.StatusSeeOther)
}

func updateServerStatus(backendURL *url.URL) {
	go func() {
		for {
			resp, err := http.Get(backendURL.String())
			statusMu.Lock()
			if err != nil || resp.StatusCode >= 400 {
				serverStatus = "Inactive"
			} else {
				serverStatus = "Active"
			}
			statusMu.Unlock()
			if resp != nil {
				resp.Body.Close()
			}
			time.Sleep(5 * time.Second)
		}
	}()
}

func getStatus(w http.ResponseWriter, r *http.Request) {
	statusMu.Lock()
	defer statusMu.Unlock()
	configMu.Lock()
	defer configMu.Unlock()
	zrokMu.Lock()
	defer zrokMu.Unlock()

	localhostURL := "http://localhost:4040"
	if config != nil && config.BackendURL != nil {
		localhostURL = config.BackendURL.String()
	}

	response := struct {
		ServerStatus string `json:"serverStatus"`
		LocalhostURL string `json:"localhostURL"`
		ZrokURL      string `json:"zrokURL"`
	}{
		ServerStatus: serverStatus,
		LocalhostURL: localhostURL,
		ZrokURL:      zrokURL,
	}

	json.NewEncoder(w).Encode(response)
}

func startZrok() {
	// Set initial zrokURL to indicate initialization
	zrokMu.Lock()
	zrokURL = "Initializing Zrok tunnel..."
	zrokMu.Unlock()

	// Check if zrok is installed
	zrokPath, err := exec.LookPath("zrok")
	if err != nil {
		fmt.Println("Zrok not found. Public URL will not be available.")
		zrokMu.Lock()
		zrokURL = "Zrok not installed"
		zrokMu.Unlock()
		return
	}
	fmt.Printf("Found zrok at: %s\n", zrokPath)

	// Kill any existing zrok process
	if zrokCmd != nil && zrokCmd.Process != nil {
		fmt.Println("Killing existing zrok process...")
		zrokCmd.Process.Kill()
		zrokCmd.Wait()
	}

	// Prepare the command with all arguments
	zrokArgs := []string{"share", "public", "--backend-mode", "proxy", "4040"}
	fmt.Printf("Running command: zrok %s\n", strings.Join(zrokArgs, " "))

	// Create the command
	cmd := exec.Command(zrokPath, zrokArgs...)

	// Set up output capture
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	// Start the command
	fmt.Println("Starting zrok process...")
	if err := cmd.Start(); err != nil {
		fmt.Printf("Failed to start zrok: %v\n", err)
		zrokMu.Lock()
		zrokURL = fmt.Sprintf("Failed to start zrok: %v", err)
		zrokMu.Unlock()
		return
	}

	// Store the command
	zrokCmd = cmd

	// Set up a cleanup handler
	setupCleanupHandler()

	// Process output
	go func() {
		scanner := bufio.NewScanner(io.MultiReader(stdout, stderr))
		timeout := time.After(30 * time.Second)
		for scanner.Scan() {
			select {
			case <-timeout:
				zrokMu.Lock()
				if zrokURL == "Initializing Zrok tunnel..." {
					zrokURL = "Zrok URL not found (timeout)"
				}
				zrokMu.Unlock()
				return
			default:
				line := scanner.Text()
				fmt.Println("Zrok output:", line)
				if strings.Contains(line, "http") && strings.Contains(line, "zrok.io") {
					re := regexp.MustCompile(`https://[a-zA-Z0-9\-]+\.share\.zrok\.io`)
					url := re.FindString(line)

					zrokMu.Lock()
					zrokURL = url
					zrokMu.Unlock()
					fmt.Println("=================================================")
					fmt.Println("Access your API Interceptor at:")
					fmt.Println("Local URL: http://localhost:4040/inspector/dashboard")
					fmt.Println("Public URL:", url)
					fmt.Println("=================================================")
					return
				}
			}
		}
		zrokMu.Lock()
		if zrokURL == "Initializing Zrok tunnel..." {
			zrokURL = "No zrok URL found in output"
		}
		zrokMu.Unlock()
	}()

	// Wait for the process in a separate goroutine
	go func() {
		err := cmd.Wait()
		if err != nil {
			fmt.Printf("Zrok process exited with error: %v\n", err)
		} else {
			fmt.Println("Zrok process exited normally")
		}
	}()
}

// Add a cleanup handler to kill zrok when the program exits
func setupCleanupHandler() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		fmt.Println("Shutting down, killing zrok process...")
		if zrokCmd != nil && zrokCmd.Process != nil {
			zrokCmd.Process.Kill()
		}
		os.Exit(0)
	}()
}

func main() {
	go broadcastLogs()

	zrokMu.Lock()
	zrokURL = "Public URL not available"
	zrokMu.Unlock()

	// Set up cleanup handler for the main process
	setupCleanupHandler()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		isInspectorRoute := path == "/inspector" || path == "/inspector/" || path == "/inspector/dashboard" || path == "/inspector/dashboard/"

		if isInspectorRoute {
			host := r.Host
			if !strings.Contains(host, "localhost") && !strings.Contains(host, "127.0.0.1") && !strings.Contains(host, "[::1]") {
				http.Error(w, "Inspector is only accessible from localhost", http.StatusForbidden)
				return
			}
			http.ServeFileFS(w, r, staticFiles, "static/index.html")
			return
		}

		if strings.HasPrefix(path, "/static/") {
			http.ServeFileFS(w, r, staticFiles, path)
			return
		}

		configMu.Lock()
		if config == nil || config.Proxy == nil {
			configMu.Unlock()
			http.Error(w, "Proxy not configured", http.StatusServiceUnavailable)
			return
		}
		proxy := config.Proxy
		configMu.Unlock()
		proxy.ServeHTTP(w, r)
	})

	http.HandleFunc("/configure", configureProxy)
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/status", getStatus)

	fmt.Println("=================================================")
	fmt.Println("Starting API Interceptor on port 4040")
	fmt.Println("Access your API Interceptor at:")
	fmt.Println("Local URL: http://localhost:4040/inspector")
	fmt.Println("=================================================")

	if err := http.ListenAndServe(":4040", nil); err != nil {
		fmt.Printf("Failed to start server: %v\n", err)
	}
}
