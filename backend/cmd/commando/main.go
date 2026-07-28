package main

import (
	"os"

	"github.com/systembug/commando/cmd/commando/commands"
)

func main() {
	if err := commands.Execute(); err != nil {
		os.Exit(1)
	}
}
