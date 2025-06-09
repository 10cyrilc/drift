package server

import (
	"embed"
	"fmt"
	"net/http"

	"drift/internal/handlers"
	"drift/internal/models"
	"drift/internal/tunnel"
)

// Start initializes and starts the HTTP server
func Start(state *models.AppState, staticFiles embed.FS, port string) error {
	// Set up cleanup handler
	tunnel.SetupCleanupHandler(state)

	// Set up HTTP routes
	http.HandleFunc("/", handlers.HandleHTTPRequest(state, staticFiles))
	http.HandleFunc("/configure", handlers.ConfigureProxy(state, port))
	http.HandleFunc("/ws", handlers.HandleWebSocket(state))
	http.HandleFunc("/status", handlers.GetStatus(state))

	// Start broadcasting logs
	handlers.BroadcastLogs(state)

	// Start the server
	fmt.Println("=================================================")
	fmt.Printf("Starting DRIFT on port %s\n", port)
	fmt.Println("Configure DRIFT at:")
	fmt.Printf("Local URL: http://localhost:%s/inspector/configure\n", port)
	fmt.Println("=================================================")

	return http.ListenAndServe(":"+port, nil)
}
