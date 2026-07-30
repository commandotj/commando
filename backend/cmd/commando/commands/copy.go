package commands

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/commandotj/commando/internal/copy"
)

func init() {
	copyCmd := &cobra.Command{
		Use:   "copy [sources...]",
		Short: "Copy files or directories into a destination",
		Args:  cobra.MinimumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			dest, _ := cmd.Flags().GetString("dest")
			if dest == "" {
				exitOnError(fmt.Errorf("--dest is required"))
			}

			result, err := copy.Batch(args, dest)
			exitOnError(err)
			fmt.Printf("copied %d item(s), batch=%s\n", len(args), result.BatchID)
		},
	}
	copyCmd.Flags().String("dest", "", "destination directory")
	_ = copyCmd.MarkFlagRequired("dest")
	rootCmd.AddCommand(copyCmd)
}
