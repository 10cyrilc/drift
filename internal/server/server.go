package server

import (
    "embed"
    "fmt"
    "net/http"

    "api-interceptor/internal/handlers"
    "api-interceptor/internal/models"
    "api-interceptor/internal/tunnel"
)

// Start initializes and starts the HTTP server
func Start(state *models.AppState, staticFiles embed.FS, port string) error {
    // Set up cleanup handler
    tunnel.SetupCleanupHandler(state)

    // Set up HTTP routes
    http.HandleFunc("/", handlers.HandleHTTPRequest(state, staticFiles))
    http.HandleFunc("/configure", handlers.ConfigureProxy(state))
    http.HandleFunc("/ws", handlers.HandleWebSocket(state))
    http.HandleFunc("/status", handlers.GetStatus(state))

    // Start broadcasting logs
    handlers.BroadcastLogs(state)

    // Start the server
    fmt.Println("=================================================")
    fmt.Printf("Starting API Interceptor on port %s\n", port)
    fmt.Println("Access your API Interceptor at:")
    fmt.Printf("Local URL: http://localhost:%s/inspector\n", port)
    fmt.Println("=================================================")

    return http.ListenAndServe(":"+port, nil)
}