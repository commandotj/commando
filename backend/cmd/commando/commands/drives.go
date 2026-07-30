package commands

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/commandotj/commando/internal/drive"
)

func init() {
	drivesCmd := &cobra.Command{
		Use:   "drives",
		Short: "List mounted drives and volumes",
		Run: func(cmd *cobra.Command, _ []string) {
			drives, err := drive.List()
			exitOnError(err)

			if asJSON, _ := cmd.Flags().GetBool("json"); asJSON {
				enc := json.NewEncoder(os.Stdout)
				enc.SetIndent("", "  ")
				exitOnError(enc.Encode(drives))
				return
			}

			for _, item := range drives {
				path := ""
				if len(item.Mountpoints) > 0 {
					path = item.Mountpoints[0]["path"]
				}
				fmt.Printf("%s\t%s\n", item.Device, path)
			}
		},
	}
	drivesCmd.Flags().Bool("json", false, "print JSON")
	rootCmd.AddCommand(drivesCmd)
}
