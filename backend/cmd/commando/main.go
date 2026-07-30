package main

import (
	"fmt"
	"os"

	"github.com/commandotj/commando/cmd/commando/commands"
)

func main() {
	if err := commands.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}
}
