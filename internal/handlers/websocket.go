package handlers

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"

    "api-interceptor/internal/models"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}

// HandleWebSocket handles WebSocket connections
func HandleWebSocket(state *models.AppState) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        conn, err := upgrader.Upgrade(w, r, nil)
        if err != nil {
            fmt.Printf("WebSocket upgrade error: %v\n", err)
            return
        }

        conn.SetPongHandler(func(appData string) error {
            return nil
        })

        state.ClientsMu.Lock()
        state.Clients[conn] = true
        state.ClientsMu.Unlock()

        go func() {
            ticker := time.NewTicker(30 * time.Second)
            defer ticker.Stop()
            for range ticker.C {
                state.ClientsMu.Lock()
                if _, ok := state.Clients[conn]; !ok {
                    state.ClientsMu.Unlock()
                    return
                }
                err := conn.WriteMessage(websocket.PingMessage, nil)
                if err != nil {
                    conn.Close()
                    delete(state.Clients, conn)
                    state.ClientsMu.Unlock()
                    return
                }
                state.ClientsMu.Unlock()
            }
        }()

        defer func() {
            state.ClientsMu.Lock()
            delete(state.Clients, conn)
            state.ClientsMu.Unlock()
            conn.Close()
        }()

        for {
            _, _, err := conn.ReadMessage()
            if err != nil {
                break
            }
        }
    }
}

// BroadcastLogs broadcasts API logs to all connected WebSocket clients
func BroadcastLogs(state *models.AppState) {
    go func() {
        for logEntry := range state.LogChan {
            logJSON, err := json.Marshal(logEntry)
            if err != nil {
                fmt.Printf("Error marshaling log: %v\n", err)
                continue
            }

            state.ClientsMu.Lock()
            for client := range state.Clients {
                err := client.WriteMessage(websocket.TextMessage, logJSON)
                if err != nil {
                    client.Close()
                    delete(state.Clients, client)
                }
            }
            state.ClientsMu.Unlock()
        }
    }()
}