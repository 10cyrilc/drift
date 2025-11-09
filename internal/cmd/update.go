package cmd

import (
	"fmt"
	"runtime"

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

	binaryName := "drift"
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}

	fmt.Printf("Updating to version %s...\n", latest.Version)
	err = updater.UpdateTo(latest, binaryName)
	if err != nil {
		fmt.Println("😟 Error during update:", err)
		return
	}

	fmt.Printf("✅ Successfully updated to version %s\n", latest.Version)
}
