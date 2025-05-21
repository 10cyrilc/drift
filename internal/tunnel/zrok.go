package tunnel

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"regexp"
	"strings"
	"syscall"
	"time"

	"api-interceptor/internal/models"
)

// StartZrok starts a zrok tunnel for public access
func StartZrok(state *models.AppState, port string) {
	// Set initial zrokURL to indicate initialization
	state.ZrokMu.Lock()
	state.ZrokURL = "Initializing Zrok tunnel..."
	state.ZrokMu.Unlock()

	// Check if zrok is installed
	zrokPath, err := exec.LookPath("zrok")
	if err != nil {
		fmt.Println("Zrok not found. Public URL will not be available.")
		state.ZrokMu.Lock()
		state.ZrokURL = "Zrok not installed"
		state.ZrokMu.Unlock()
		return
	}

	// Kill any existing zrok process
	state.ZrokCmd.Lock()
	if state.ZrokProcess != nil {
		if process, ok := state.ZrokProcess.(*exec.Cmd); ok && process.Process != nil {
			fmt.Println("Killing existing zrok process...")
			process.Process.Kill()
			process.Wait()
		}
	}
	state.ZrokCmd.Unlock()

	// Prepare the command with all arguments
	zrokArgs := []string{"share", "public", "--backend-mode", "proxy", port}

	// Create the command
	cmd := exec.Command(zrokPath, zrokArgs...)

	// Set up output capture
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	// Start the command
	fmt.Println("Starting zrok process...")
	if err := cmd.Start(); err != nil {
		fmt.Printf("Failed to start zrok: %v\n", err)
		state.ZrokMu.Lock()
		state.ZrokURL = fmt.Sprintf("Failed to start zrok: %v", err)
		state.ZrokMu.Unlock()
		return
	}

	// Store the command
	state.ZrokCmd.Lock()
	state.ZrokProcess = cmd
	state.ZrokCmd.Unlock()

	// Process output
	go func() {
		scanner := bufio.NewScanner(io.MultiReader(stdout, stderr))
		timeout := time.After(30 * time.Second)
		for scanner.Scan() {
			select {
			case <-timeout:
				state.ZrokMu.Lock()
				if state.ZrokURL == "Initializing Zrok tunnel..." {
					state.ZrokURL = "Zrok URL not found (timeout)"
				}
				state.ZrokMu.Unlock()
				return
			default:
				line := scanner.Text()
				if strings.Contains(line, "http") && strings.Contains(line, "zrok.io") {

					re := regexp.MustCompile(`https://[a-zA-Z0-9\-]+\.share\.zrok\.io`)
					url := re.FindString(line)

					state.ZrokMu.Lock()
					state.ZrokURL = url
					state.ZrokMu.Unlock()
					fmt.Println("=================================================")
					fmt.Println("Access your API Interceptor at:")
					fmt.Printf("Local URL: http://localhost:%s/inspector/dashboard\n", port)
					fmt.Println("Public URL:", url)
					fmt.Println("=================================================")
					return
				}
			}
		}
		state.ZrokMu.Lock()
		if state.ZrokURL == "Initializing Zrok tunnel..." {
			state.ZrokURL = "No zrok URL found in output"
		}
		state.ZrokMu.Unlock()
	}()

	// Wait for the process in a separate goroutine
	go func() {
		err := cmd.Wait()
		if err != nil {
			fmt.Printf("Zrok process exited with error: %v\n", err)
		} else {
			fmt.Println("Zrok process exited normally")
		}
	}()
}

// SetupCleanupHandler sets up a handler to clean up resources on exit
func SetupCleanupHandler(state *models.AppState) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		fmt.Println("Shutting down, killing zrok process...")
		state.ZrokCmd.Lock()
		if state.ZrokProcess != nil {
			if process, ok := state.ZrokProcess.(*exec.Cmd); ok && process.Process != nil {
				process.Process.Kill()
			}
		}
		state.ZrokCmd.Unlock()
		os.Exit(0)
	}()
}
