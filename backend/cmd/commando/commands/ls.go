package commands

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/commandotj/commando/internal/file"
)

func init() {
	lsCmd := &cobra.Command{
		Use:   "ls [path]",
		Short: "List directory entries",
		Args:  cobra.MaximumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			path, err := resolvePath(args)
			exitOnError(err)

			hidden, _ := cmd.Flags().GetBool("all")
			entries, err := file.ListDir(path, file.ListOptions{IncludeHidden: hidden})
			exitOnError(err)

			if asJSON, _ := cmd.Flags().GetBool("json"); asJSON {
				enc := json.NewEncoder(os.Stdout)
				enc.SetIndent("", "  ")
				exitOnError(enc.Encode(entries))
				return
			}

			for _, entry := range entries {
				kind := "file"
				if entry.IsDirectory {
					kind = "dir"
				}
				fmt.Printf("%s\t%s\t%d\n", kind, entry.Name, entry.Size)
			}
		},
	}
	lsCmd.Flags().Bool("all", false, "include hidden entries")
	lsCmd.Flags().Bool("json", false, "print JSON")
	rootCmd.AddCommand(lsCmd)
}

func resolvePath(args []string) (string, error) {
	if len(args) == 0 {
		return file.HomeDir()
	}
	return args[0], nil
}
