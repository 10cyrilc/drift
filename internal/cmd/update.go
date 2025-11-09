package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/blang/semver"
	"github.com/rhysd/go-github-selfupdate/selfupdate"
)

const slug = "10cyrilc/drift"

func Update(currentVersion string) {
	v := semver.MustParse(currentVersion)
	fmt.Println("🚀 Checking for updates...")

	updater, err := selfupdate.NewUpdater(selfupdate.Config{})
	if err != nil {
		fmt.Println("❌ Error creating updater:", err)
		return
	}

	latest, found, err := updater.DetectLatest(slug)
	if err != nil {
		fmt.Println("❌ Error detecting latest version:", err)
		return
	}

	if !found || latest.Version.LTE(v) {
		fmt.Println("🎉 You are already on the latest version.")
		return
	}

	fmt.Printf("New version available: %s → %s\n", v, latest.Version)

	exePath, err := os.Executable()
	if err != nil {
		fmt.Println("❌ Could not determine executable path:", err)
		return
	}
	exePath, _ = filepath.EvalSymlinks(exePath)

	// Simple spinner animation using only fmt + time
	done := make(chan bool)
	go func() {
		spinChars := []rune{'|', '/', '-', '\\'}
		i := 0
		for {
			select {
			case <-done:
				fmt.Printf("\r") // clear spinner line
				return
			default:
				fmt.Printf("\r⬇️  Downloading update... %c", spinChars[i%len(spinChars)])
				time.Sleep(100 * time.Millisecond)
				i++
			}
		}
	}()

	err = updater.UpdateTo(latest, exePath)
	done <- true
	if err != nil {
		fmt.Println("😟 Error during update:", err)
		return
	}

	fmt.Printf("✅ Successfully updated to version %s\n", latest.Version)
	if runtime.GOOS == "windows" {
		fmt.Printf("📁 Updated binary: %s\n", exePath)
	}
}
