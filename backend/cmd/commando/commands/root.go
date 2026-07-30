package commands

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "commando",
	Short: "Dual-pane folder sync file manager",
	Long:  "Commando CLI — sync, copy, and browse local folders. Core engine used by the desktop app.",
	SilenceErrors: true,
	SilenceUsage:  true,
}

// Exit codes per RFC-021 CLI-05.
const (
	ExitSuccess = 0
	ExitError   = 2
)

// Execute runs the CLI. Errors print to stderr and exit with code 2.
func Execute() error {
	return rootCmd.Execute()
}

func exitOnError(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(ExitError)
	}
}
