package main

import (
	"embed"

	"api-interceptor/internal/cmd"
)

//go:embed static/*
var staticFiles embed.FS

// Version of the application
const Version = "0.1.0"

func main() {
	cmd.Execute(staticFiles, Version)
}
