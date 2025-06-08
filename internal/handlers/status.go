package handlers

import (
	"encoding/json"
	"net/http"

	"drift/internal/models"
)

// GetStatus handles the status endpoint
func GetStatus(state *models.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		state.StatusMu.Lock()
		defer state.StatusMu.Unlock()
		state.ConfigMu.Lock()
		defer state.ConfigMu.Unlock()
		state.ZrokMu.Lock()
		defer state.ZrokMu.Unlock()

		localhostURL := "http://localhost:4040"
		if state.Config != nil && state.Config.BackendURL != nil {
			localhostURL = state.Config.BackendURL.String()
		}

		response := models.StatusResponse{
			ServerStatus: state.ServerStatus,
			LocalhostURL: localhostURL,
			ZrokURL:      state.ZrokURL,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}
