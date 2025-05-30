package cmd

import (
	"embed"
	"flag"
	"fmt"
	"os"

	"api-interceptor/internal/config"
	"api-interceptor/internal/models"
	"api-interceptor/internal/server"
)

// Execute parses command line arguments and executes the appropriate command
func Execute(staticFiles embed.FS, version string) {
	// Define flags
	portFlag := flag.String("p", "", "Port to run the server on")
	versionFlag := flag.Bool("v", false, "Show version information")
	helpFlag := flag.Bool("h", false, "Show help information")

	// Parse flags
	flag.Parse()

	// Handle version flag
	if *versionFlag {
		fmt.Printf("API Interceptor version %s\n", version)
		return
	}

	// Handle help flag or help command
	args := flag.Args()
	if *helpFlag || (len(args) > 0 && args[0] == "help") {
		ShowHelp()
		return
	}

	// If no arguments or flags are provided, show help
	if flag.NFlag() == 0 && len(args) == 0 {
		ShowHelp()
		return
	}

	// Handle commands
	if len(args) > 0 {
		switch args[0] {
		case "serve":
			StartServer(*portFlag, staticFiles)
			return
		default:
			fmt.Printf("Unknown command: %s\n", args[0])
			ShowHelp()
			return
		}
	}

	// If only port flag is provided, start server
	if *portFlag != "" {
		StartServer(*portFlag, staticFiles)
		return
	}
}

// ShowHelp displays help information
func ShowHelp() {
	fmt.Println("API Interceptor - A fast and lightweight reverse proxy for inspecting API traffic")
	fmt.Println("\nUsage:")
	fmt.Println("  api-interceptor [command] [flags]")
	fmt.Println("\nCommands:")
	fmt.Println("  serve          Start the API Interceptor server")
	fmt.Println("  help           Show help information")
	fmt.Println("\nFlags:")
	fmt.Println("  -p PORT        Port to run the server on (overrides default and environment variable)")
	fmt.Println("  -v             Show version information")
	fmt.Println("  -h             Show help information")
	fmt.Println("\nEnvironment Variables:")
	fmt.Println("  API_INTERCEPTOR_PORT  Set the server port")
}

// StartServer starts the API Interceptor server
func StartServer(portFlag string, staticFiles embed.FS) {
	// Load configuration
	cfg := config.Load()

	// Override port with flag if provided
	if portFlag != "" {
		cfg.Port = portFlag
	}

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
