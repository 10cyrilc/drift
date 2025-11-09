package cmd

import (
	"embed"
	"flag"
	"fmt"
	"os"

	"drift/internal/config"
	"drift/internal/models"
	"drift/internal/server"
)

// Execute parses command line arguments and executes the appropriate command
func Execute(staticFiles embed.FS, version string) {
	// Define top-level flags
	versionFlag := flag.Bool("v", false, "Show version information")
	helpFlag := flag.Bool("h", false, "Show help information")

	// Define subcommand for "serve"
	serveCmd := flag.NewFlagSet("serve", flag.ExitOnError)
	portFlag := serveCmd.String("p", "", "Port to run the server on")

	// Parse top-level flags
	flag.Parse()

	// Handle version flag
	if *versionFlag {
		fmt.Printf("DRIFT version %s\n", version)
		return
	}

	// Handle help flag or help command
	args := flag.Args()
	if *helpFlag || (len(args) > 0 && args[0] == "help") {
		ShowHelp()
		return
	}

	// If no arguments or flags are provided, show help
	if len(args) == 0 {
		ShowHelp()
		return
	}

	// Handle commands
	switch args[0] {
	case "serve":
		// Parse flags for the "serve" command
		serveCmd.Parse(args[1:])
		StartServer(*portFlag, staticFiles)
	case "update":
		Update(version)
	case "release":
		args := flag.Args()
		all := len(args) > 1 && args[1] == "all"
		Release(all)

	default:
		fmt.Printf("Unknown command: %s\n", args[0])
		ShowHelp()
	}
}

// ShowHelp displays help information
func ShowHelp() {
	fmt.Println("DRIFT - A fast and lightweight reverse proxy for inspecting API traffic")
	fmt.Println("\nUsage:")
	fmt.Println("  drift [command]")
	fmt.Println("\nCommands:")
	fmt.Println("  serve [flags]  Start DRIFT server")
	fmt.Println("    -p PORT      Port to run the server on (overrides default and environment variable)")
	fmt.Println("  update         Update DRIFT to the latest version")
	fmt.Println("  release        Release a reserved zrok token")
	fmt.Println("  help           Show help information")
	fmt.Println("\nGlobal Flags:")
	fmt.Println("  -v             Show version information")
	fmt.Println("  -h             Show help information")
	fmt.Println("\nEnvironment Variables:")
	fmt.Println("  DRIFT_PORT     Set the server port")
}

// StartServer starts DRIFT server
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
	fmt.Println("Starting DRIFT...")
	err := server.Start(state, staticFiles, cfg.Port)
	if err != nil {
		fmt.Printf("Failed to start server: %v\n", err)
		os.Exit(1)
	}
}
