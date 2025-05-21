package models

import (
	"net/http/httputil"
	"net/url"
	"sync"

	"github.com/gorilla/websocket"
)

// RequestLog represents a logged HTTP request
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

// ResponseLog represents a logged HTTP response
type ResponseLog struct {
	ID         string            `json:"id"`
	StatusCode int               `json:"status_code"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	Timestamp  string            `json:"timestamp"`
}

// APILog represents a complete API request-response cycle
type APILog struct {
	Request  RequestLog  `json:"request"`
	Response ResponseLog `json:"response"`
}

// ProxyConfig holds the configuration for the reverse proxy
type ProxyConfig struct {
	BackendURL  *url.URL
	Proxy       *httputil.ReverseProxy
	BackendPort string
}

// AppState holds the global application state
type AppState struct {
	Clients      map[*websocket.Conn]bool
	ClientsMu    sync.Mutex
	LogChan      chan APILog
	Config       *ProxyConfig
	ConfigMu     sync.Mutex
	ZrokURL      string
	ZrokMu       sync.Mutex
	ServerStatus string
	StatusMu     sync.Mutex
	ZrokCmd      *sync.Mutex
	ZrokProcess  interface{}
}

// NewAppState creates a new application state
func NewAppState() *AppState {
	return &AppState{
		Clients:      make(map[*websocket.Conn]bool),
		LogChan:      make(chan APILog, 100),
		ZrokURL:      "Public URL not available",
		ZrokCmd:      &sync.Mutex{},
		ServerStatus: "Not configured",
	}
}

// StatusResponse represents the response for the status endpoint
type StatusResponse struct {
	ServerStatus string `json:"serverStatus"`
	LocalhostURL string `json:"localhostURL"`
	ZrokURL      string `json:"zrokURL"`
}
