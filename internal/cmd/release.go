package cmd

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"

	"drift/internal/tunnel"
)

// Release handles releasing reserved zrok tokens interactively or all at once.
func Release(all bool) {
	tokens, err := tunnel.GetAllReservedZrokTokens()
	if err != nil {
		fmt.Printf("❌ Failed to get reserved zrok tokens: %v\n", err)
		return
	}

	if len(tokens) == 0 {
		fmt.Println("ℹ️  No reserved zrok tokens found.")
		return
	}

	if all {
		fmt.Println("🔄 Releasing all reserved tokens...")
		for _, token := range tokens {
			if err := tunnel.ReleaseZrokToken(token); err != nil {
				fmt.Printf("❌ Failed to release %s: %v\n", token, err)
			} else {
				fmt.Printf("✅ Released %s\n", token)
			}
		}
		return
	}

	// --- Interactive multi-select mode ---
	fmt.Println("Select one or more zrok tokens to release (e.g. 1 2 3):")
	for i, token := range tokens {
		fmt.Printf("[%d] %s\n", i+1, token)
	}

	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Enter numbers separated by spaces (or 0 to cancel): ")
	input, _ := reader.ReadString('\n')
	input = strings.TrimSpace(input)

	if input == "0" || input == "" {
		fmt.Println("🚫 Release canceled.")
		return
	}

	selections := strings.Fields(input)
	var selectedTokens []string

	for _, sel := range selections {
		index, err := strconv.Atoi(sel)
		if err != nil || index <= 0 || index > len(tokens) {
			fmt.Printf("⚠️  Skipping invalid selection: %q\n", sel)
			continue
		}
		selectedTokens = append(selectedTokens, tokens[index-1])
	}

	if len(selectedTokens) == 0 {
		fmt.Println("❌ No valid tokens selected.")
		return
	}

	fmt.Printf("Releasing %d selected token(s)...\n", len(selectedTokens))
	for _, token := range selectedTokens {
		if err := tunnel.ReleaseZrokToken(token); err != nil {
			fmt.Printf("❌ Failed to release %s: %v\n", token, err)
		} else {
			fmt.Printf("✅ Released %s\n", token)
		}
	}
}
