package config

import (
	"flag"
	"os"
	"strconv"
)

// Config holds the application configuration
type Config struct {
	Port string
}

// Load loads the configuration from environment variables and command line flags
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

	// Parse command line flags
	portFlag := flag.String("port", config.Port, "Port to run the server on")
	flag.Parse()

	// Command line flags take precedence over environment variables
	if *portFlag != config.Port {
		if _, err := strconv.Atoi(*portFlag); err == nil {
			config.Port = *portFlag
		}
	}

	return config
}
