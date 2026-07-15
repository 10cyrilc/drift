package handlers

import (
	"encoding/json"
	"net"
	"net/http"

	"drift/internal/models"
	"drift/internal/tunnel"
)

// isPrivateIPv4 checks if the IP belongs to a private subnet (RFC 1918)
func isPrivateIPv4(ip net.IP) bool {
	if ip == nil {
		return false
	}
	ip4 := ip.To4()
	if ip4 == nil {
		return false
	}
	// 10.0.0.0/8
	if ip4[0] == 10 {
		return true
	}
	// 172.16.0.0/12
	if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
		return true
	}
	// 192.168.0.0/16
	if ip4[0] == 192 && ip4[1] == 168 {
		return true
	}
	return false
}

// getLocalIPv4 retrieves the local machine's non-loopback IPv4 address, prioritizing private subnets
func getLocalIPv4() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "127.0.0.1"
	}
	var fallback string
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			ip := ipnet.IP.To4()
			if ip != nil {
				if isPrivateIPv4(ip) {
					return ip.String()
				}
				if fallback == "" {
					fallback = ip.String()
				}
			}
		}
	}
	if fallback != "" {
		return fallback
	}
	return "127.0.0.1"
}

// GetStatus handles the status endpoint
func GetStatus(state *models.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		state.StatusMu.Lock()
		defer state.StatusMu.Unlock()
		state.ConfigMu.Lock()
		defer state.ConfigMu.Unlock()
		state.ZrokMu.Lock()
		defer state.ZrokMu.Unlock()

		localhostURL := ""
		if state.Config != nil && state.Config.BackendURL != nil {
			localhostURL = state.Config.BackendURL.String()
		}

		zrokUniqueName := ""
		zrokOption := ""
		backendPort := ""
		if state.Config != nil {
			zrokUniqueName = state.Config.ZrokUniqueName
			zrokOption = state.Config.ZrokOption
			backendPort = state.Config.BackendPort
		}

		driftPort := "4040"
		if state.DriftPort != "" {
			driftPort = state.DriftPort
		}

		driftURL := "http://localhost:" + driftPort
		if ip := getLocalIPv4(); ip != "" {
			driftURL = "http://" + ip + ":" + driftPort
		}

		response := models.StatusResponse{
			ServerStatus:   state.ServerStatus,
			LocalhostURL:   localhostURL,
			ZrokURL:        state.ZrokURL,
			ZrokUniqueName: zrokUniqueName,
			ZrokOption:     zrokOption,
			ZrokEnabled:    tunnel.IsZrokEnabled(),
			DriftURL:       driftURL,
			BackendPort:    backendPort,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}
