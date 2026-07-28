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
}

// Execute runs the CLI.
func Execute() error {
	return rootCmd.Execute()
}

func exitOnError(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
