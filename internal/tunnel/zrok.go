package tunnel

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"drift/internal/models"

	httptransport "github.com/go-openapi/runtime/client"
	"github.com/google/uuid"
	"github.com/openziti/sdk-golang/ziti/edge"
	"github.com/openziti/zrok/v2/environment"
	"github.com/openziti/zrok/v2/environment/env_core"
	restEnvironment "github.com/openziti/zrok/v2/rest_client_zrok/environment"
	"github.com/openziti/zrok/v2/rest_client_zrok/share"
	"github.com/openziti/zrok/v2/rest_model_zrok"
	"github.com/openziti/zrok/v2/sdk/golang/sdk"
	zrokUtil "github.com/openziti/zrok/v2/util"
)

// ZrokSession represents an active zrok sharing tunnel session
type ZrokSession struct {
	Listener    edge.Listener
	ShareToken  string
	IsEphemeral bool
}

// Close closes the zrok tunnel listener and deletes active shares
func (s *ZrokSession) Close() error {
	var err error
	if s.Listener != nil {
		err = s.Listener.Close()
	}
	if s.ShareToken != "" {
		if root, rootErr := environment.LoadRoot(); rootErr == nil {
			_ = sdk.DeleteShare(root, &sdk.Share{Token: s.ShareToken})
		}
	}
	return err
}

// IsZrokEnabled returns true if the local zrok environment is enabled
func IsZrokEnabled() bool {
	root, err := environment.LoadRoot()
	if err != nil {
		return false
	}
	return root.IsEnabled()
}

// EnableZrokEnvironment registers and enables a local zrok environment using an account token
func EnableZrokEnvironment(token string) error {
	root, err := environment.LoadRoot()
	if err != nil {
		return fmt.Errorf("failed to load zrok root: %v", err)
	}

	if root.IsEnabled() {
		return fmt.Errorf("zrok environment is already enabled")
	}

	hostName, hostDetail, username, err := zrokUtil.GetHostDetails()
	if err != nil {
		hostName = "drift-host"
		hostDetail = "drift-service"
		username = "drift"
	}
	hostDetail, description := zrokUtil.FormatHostDetailsWithUser(username, hostName, hostDetail, "drift-proxy")

	zrok, err := root.Client()
	if err != nil {
		return fmt.Errorf("error creating service client: %v", err)
	}
	auth := httptransport.APIKeyAuth("X-TOKEN", "header", token)
	req := restEnvironment.NewEnableParams()
	req.Body.Description = description
	req.Body.Host = hostDetail

	resp, err := zrok.Environment.Enable(req, auth)
	if err != nil {
		return fmt.Errorf("the zrok service returned an error: %v", err)
	}

	apiEndpoint, _ := root.ApiEndpoint()
	if err := root.SetEnvironment(&env_core.Environment{AccountToken: token, ZitiIdentity: resp.Payload.Identity, ApiEndpoint: apiEndpoint}); err != nil {
		return fmt.Errorf("error saving environment: %v", err)
	}

	if err := root.SaveZitiIdentityNamed(root.EnvironmentIdentityName(), resp.Payload.Cfg); err != nil {
		return fmt.Errorf("error writing environment identity: %v", err)
	}

	return nil
}

// ReserveZrokToken reserves a new zrok name within the public namespace
func ReserveZrokToken(port string, uniqueName string) (string, string, error) {
	root, err := environment.LoadRoot()
	if err != nil {
		return "", "", fmt.Errorf("zrok environment not enabled: %v", err)
	}

	if uniqueName == "" {
		u := uuid.New().String()
		uniqueName = "drift-" + strings.ReplaceAll(u, "-", "")[:8]
	}

	zrok, err := root.Client()
	if err != nil {
		return "", "", fmt.Errorf("error getting zrok client: %v", err)
	}
	auth := httptransport.APIKeyAuth("X-TOKEN", "header", root.Environment().AccountToken)

	params := share.NewCreateShareNameParams()
	params.Body.Name = uniqueName
	params.Body.NamespaceToken = "public"

	_, err = zrok.Share.CreateShareName(params, auth)
	if err != nil {
		// If creation failed, check if the name is already reserved by our account so we can reuse it
		if names, errOverview := GetAllReservedZrokTokens(); errOverview == nil {
			for _, n := range names {
				if n == uniqueName {
					fmt.Printf("Name %s is already reserved by this account, reusing it\n", uniqueName)
					url := fmt.Sprintf("https://%s.shares.zrok.io", uniqueName)
					return uniqueName, url, nil
				}
			}
		}
		return "", "", fmt.Errorf("failed to create reserved name %s: %v", uniqueName, err)
	}

	url := fmt.Sprintf("https://%s.shares.zrok.io", uniqueName)
	return uniqueName, url, nil
}

// getActiveShareTokenForName queries the zrok overview to find any active share token bound to a name
func getActiveShareTokenForName(root env_core.Root, name string) (string, error) {
	overviewStr, err := sdk.Overview(root)
	if err != nil {
		return "", err
	}

	var overview rest_model_zrok.Overview
	if err := json.Unmarshal([]byte(overviewStr), &overview); err != nil {
		return "", err
	}

	for _, nameItem := range overview.Names {
		if nameItem != nil && nameItem.Name == name {
			return nameItem.ShareToken, nil
		}
	}
	return "", nil
}

// ReleaseZrokToken releases/deletes a reserved zrok name and any active share associated with it
func ReleaseZrokToken(token string) error {
	root, err := environment.LoadRoot()
	if err != nil {
		return fmt.Errorf("zrok environment not enabled: %v", err)
	}

	zrok, err := root.Client()
	if err != nil {
		return fmt.Errorf("error getting zrok client: %v", err)
	}
	auth := httptransport.APIKeyAuth("X-TOKEN", "header", root.Environment().AccountToken)

	// Clean up any active share attached to this name first
	if shareToken, err := getActiveShareTokenForName(root, token); err == nil && shareToken != "" {
		fmt.Printf("Cleaning up active share %s before releasing name %s\n", shareToken, token)
		_ = sdk.DeleteShare(root, &sdk.Share{Token: shareToken})
	}

	// Delete the reserved name
	params := share.NewDeleteShareNameParams()
	params.Body.Name = token
	params.Body.NamespaceToken = "public"

	_, err = zrok.Share.DeleteShareName(params, auth)
	if err != nil {
		return fmt.Errorf("failed to delete reserved name %s: %v", token, err)
	}

	return nil
}

// GetAllReservedZrokTokens retrieves all reserved name tokens for the account
func GetAllReservedZrokTokens() ([]string, error) {
	root, err := environment.LoadRoot()
	if err != nil {
		return nil, fmt.Errorf("zrok environment not enabled: %v", err)
	}

	overviewStr, err := sdk.Overview(root)
	if err != nil {
		return nil, fmt.Errorf("failed to get zrok overview: %v", err)
	}

	var overview rest_model_zrok.Overview
	if err := json.Unmarshal([]byte(overviewStr), &overview); err != nil {
		return nil, fmt.Errorf("failed to parse zrok overview: %v", err)
	}

	var tokens []string
	for _, nameItem := range overview.Names {
		if nameItem != nil && nameItem.Name != "" {
			tokens = append(tokens, nameItem.Name)
		}
	}
	return tokens, nil
}

// StartZrok starts hosting a native zrok public share reverse proxy to localhost in the background
func StartZrok(state *models.AppState, port string) {
	state.ZrokMu.Lock()
	state.ZrokURL = "Initializing Zrok tunnel..."
	state.ZrokMu.Unlock()

	root, err := environment.LoadRoot()
	if err != nil {
		fmt.Printf("Zrok environment error: %v\n", err)
		state.ZrokMu.Lock()
		state.ZrokURL = "Zrok environment not enabled"
		state.ZrokMu.Unlock()
		return
	}

	state.ConfigMu.Lock()
	reservedToken := state.Config.ZrokToken
	tokenPort := state.Config.ZrokPort
	state.ConfigMu.Unlock()

	isEphemeral := false
	if reservedToken == "" {
		isEphemeral = true
	}

	// If it is ephemeral, we first reserve a temporary random name so we have a persistent identifier
	if isEphemeral {
		fmt.Println("No reserved token available, creating a temporary random reservation")
		token, _, err := ReserveZrokToken(port, "")
		if err != nil {
			fmt.Printf("Failed to create random reservation: %v\n", err)
			state.ZrokMu.Lock()
			state.ZrokURL = fmt.Sprintf("Failed to initialize: %v", err)
			state.ZrokMu.Unlock()
			return
		}
		reservedToken = token
	} else {
		// Clean up any active zombie share attached to this name first to prevent conflicts
		if shareToken, err := getActiveShareTokenForName(root, reservedToken); err == nil && shareToken != "" {
			fmt.Printf("Cleaning up active zombie share %s attached to name %s\n", shareToken, reservedToken)
			_ = sdk.DeleteShare(root, &sdk.Share{Token: shareToken})
		}
	}

	if tokenPort != "" && tokenPort != port {
		fmt.Printf("Warning: Token %s was created for port %s but current port is %s\n",
			reservedToken, tokenPort, port)
	}

	// Create zrok public proxy share
	fmt.Println("Creating zrok share for token:", reservedToken)
	shr, err := sdk.CreateShare(root, &sdk.ShareRequest{
		BackendMode: sdk.ProxyBackendMode,
		ShareMode:   sdk.PublicShareMode,
		Target:      "http://localhost:" + port,
		NameSelections: []sdk.NameSelection{
			{
				NamespaceToken: "public",
				Name:           reservedToken,
			},
		},
	})
	if err != nil {
		fmt.Printf("Failed to create zrok share: %v\n", err)
		state.ZrokMu.Lock()
		state.ZrokURL = fmt.Sprintf("Failed to create share: %v", err)
		state.ZrokMu.Unlock()

		// If we created a temporary reservation, clean it up
		if isEphemeral {
			_ = ReleaseZrokToken(reservedToken)
		}
		return
	}

	urlStr := shr.FrontendEndpoints[0]
	if !strings.HasPrefix(urlStr, "http://") && !strings.HasPrefix(urlStr, "https://") {
		urlStr = "https://" + urlStr
	}

	// Start zrok native listener
	listener, err := sdk.NewListener(shr.Token, root)
	if err != nil {
		fmt.Printf("Failed to create zrok listener: %v\n", err)
		state.ZrokMu.Lock()
		state.ZrokURL = fmt.Sprintf("Failed to listen: %v", err)
		state.ZrokMu.Unlock()
		return
	}

	// Setup local reverse proxy
	targetURL, _ := url.Parse("http://localhost:" + port)
	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	session := &ZrokSession{
		Listener:    listener,
		ShareToken:  shr.Token,
		IsEphemeral: isEphemeral,
	}

	state.ZrokCmd.Lock()
	// Kill any existing tunnel session if active
	if state.ZrokProcess != nil {
		if prevSession, ok := state.ZrokProcess.(io.Closer); ok {
			fmt.Println("Stopping previous zrok session...")
			prevSession.Close()
		}
	}
	state.ZrokProcess = session
	state.ZrokCmd.Unlock()

	state.ZrokMu.Lock()
	state.ZrokURL = urlStr
	state.ZrokMu.Unlock()

	fmt.Println("=================================================")
	fmt.Println("Access DRIFT at:")
	fmt.Printf("Local URL: http://localhost:%s/inspector/dashboard\n", port)
	fmt.Println("Public URL:", urlStr)
	fmt.Println("=================================================")

	// Serve the reverse proxy traffic in the background
	go func() {
		if err := http.Serve(listener, proxy); err != nil && !strings.Contains(err.Error(), "use of closed network connection") {
			fmt.Printf("Zrok server exited with error: %v\n", err)
		} else {
			fmt.Println("Zrok server tunnel stopped cleanly")
		}
	}()
}

// SetupCleanupHandler sets up a handler to clean up resources on exit
func SetupCleanupHandler(state *models.AppState) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		fmt.Println("\nShutting down, cleaning up resources...")

		state.ZrokCmd.Lock()
		var activeSession io.Closer
		if state.ZrokProcess != nil {
			if session, ok := state.ZrokProcess.(io.Closer); ok {
				activeSession = session
			}
		}
		state.ZrokCmd.Unlock()

		if activeSession != nil {
			fmt.Println("Closing active zrok tunnel listener...")
			activeSession.Close()
		}

		state.ConfigMu.Lock()
		token := ""
		if state.Config != nil {
			token = state.Config.ZrokToken
		}
		state.ConfigMu.Unlock()

		if token != "" {
			fmt.Printf("Do you want to release the zrok token '%s'? (y/N): ", token)
			reader := bufio.NewReader(os.Stdin)
			input, err := reader.ReadString('\n')
			if err == nil {
				input = strings.TrimSpace(strings.ToLower(input))
				if input == "y" || input == "yes" {
					fmt.Println("Releasing zrok token:", token)
					if err := ReleaseZrokToken(token); err != nil {
						fmt.Printf("Failed to release zrok token: %v\n", err)
					} else {
						fmt.Println("Successfully released zrok token")
					}
				} else {
					fmt.Println("Keeping zrok token reserved")
				}
			}
		}

		os.Exit(0)
	}()
}
