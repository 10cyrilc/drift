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

// ReserveZrokToken reserves a new zrok share token for a specific port
func ReserveZrokToken(port string) (string, string, error) {
	zrokPath, err := exec.LookPath("zrok")
	if err != nil {
		return "", "", fmt.Errorf("zrok not found: %v", err)
	}

	cmd := exec.Command(zrokPath, "reserve", "public", "--backend-mode", "proxy", port)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", "", fmt.Errorf("failed to reserve zrok token: %v, output: %s", err, output)
	}

	// Parse the output to extract the token and URL
	outputStr := string(output)
	tokenRegex := regexp.MustCompile(`your reserved share token is '([^']+)'`)
	urlRegex := regexp.MustCompile(`reserved frontend endpoint: (https://[^\s]+)`)

	tokenMatch := tokenRegex.FindStringSubmatch(outputStr)
	urlMatch := urlRegex.FindStringSubmatch(outputStr)

	if len(tokenMatch) < 2 || len(urlMatch) < 2 {
		return "", "", fmt.Errorf("failed to parse zrok reserve output")
	}

	return tokenMatch[1], urlMatch[1], nil
}

// ReleaseZrokToken releases a reserved zrok token
func ReleaseZrokToken(token string) error {
	if token == "" {
		return nil // No token to release
	}

	zrokPath, err := exec.LookPath("zrok")
	if err != nil {
		return fmt.Errorf("zrok not found: %v", err)
	}

	cmd := exec.Command(zrokPath, "release", token)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to release zrok token: %v, output: %s", err, output)
	}

	return nil
}

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

	// Get the reserved token
	state.ConfigMu.Lock()
	reservedToken := state.Config.ZrokToken
	tokenPort := state.Config.ZrokPort
	state.ConfigMu.Unlock()

	// Check if we have a valid token
	if reservedToken == "" {
		fmt.Println("No reserved token available, using random public share")
		cmd := exec.Command(zrokPath, "share", "public", "--backend-mode", "proxy", port)
		startZrokProcess(cmd, state, port)
		return
	}

	// Check if the token is for the current port
	if tokenPort != port {
		fmt.Printf("Warning: Token %s was created for port %s but current port is %s\n",
			reservedToken, tokenPort, port)
	}

	// Create the command for reserved token
	cmd := exec.Command(zrokPath, "share", "reserved", reservedToken)
	fmt.Println("Using reserved zrok token:", reservedToken)
	startZrokProcess(cmd, state, port)
}

func startZrokProcess(cmd *exec.Cmd, state *models.AppState, port string) {
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
		fmt.Println("Shutting down, cleaning up resources...")

		// Kill zrok process
		state.ZrokCmd.Lock()
		if state.ZrokProcess != nil {
			if process, ok := state.ZrokProcess.(*exec.Cmd); ok && process.Process != nil {
				process.Process.Kill()
			}
		}
		state.ZrokCmd.Unlock()

		// Release the reserved token
		state.ConfigMu.Lock()
		token := state.Config.ZrokToken
		state.ConfigMu.Unlock()

		if token != "" {
			fmt.Println("Releasing zrok token:", token)
			if err := ReleaseZrokToken(token); err != nil {
				fmt.Printf("Failed to release zrok token: %v\n", err)
			} else {
				fmt.Println("Successfully released zrok token")
			}
		}

		os.Exit(0)
	}()
}
