//go:build tools

// Package tools pins desktop CLI tool versions for `go install`.
// Version must match scripts/tool-versions.env and apps/desktop/go.mod.
package tools

import (
	_ "github.com/wailsapp/wails/v3/cmd/wails3"
)
