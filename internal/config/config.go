package config

import (
	"os"
	"strconv"
)

// Config holds the application configuration
type Config struct {
	Port string
}

// Load loads the configuration from environment variables
func Load() *Config {
	config := &Config{
		Port: "4040",
	}

	// Check environment variables
	if port := os.Getenv("API_INTERCEPTOR_PORT"); port != "" {
		if _, err := strconv.Atoi(port); err == nil {
			config.Port = port
		}
	}

	return config
}
