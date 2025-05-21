package main

import (
	"embed"
	"fmt"
	"os"

	"api-interceptor/internal/config"
	"api-interceptor/internal/models"
	"api-interceptor/internal/server"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
	// Load configuration
	cfg := config.Load()

	// Create application state
	state := models.NewAppState()

	// Start the server
	fmt.Println("Starting API Interceptor...")
	err := server.Start(state, staticFiles, cfg.Port)
	if err != nil {
		fmt.Printf("Failed to start server: %v\n", err)
		os.Exit(1)
	}
}
