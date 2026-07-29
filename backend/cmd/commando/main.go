package main

import (
	"os"

	"github.com/systembugtj/commando/cmd/commando/commands"
)

func main() {
	if err := commands.Execute(); err != nil {
		os.Exit(1)
	}
}
