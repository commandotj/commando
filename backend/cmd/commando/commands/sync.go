package commands

import (
	"encoding/json"
	"os"

	"github.com/spf13/cobra"
	"github.com/systembug/commando/internal/sync"
)

func init() {
	syncCmd := &cobra.Command{
		Use:   "sync",
		Short: "Plan or run two-pane folder sync",
	}

	planCmd := &cobra.Command{
		Use:   "plan",
		Short: "Build a sync plan without writing files",
		Run: func(cmd *cobra.Command, _ []string) {
			left, _ := cmd.Flags().GetString("left")
			right, _ := cmd.Flags().GetString("right")
			direction, _ := cmd.Flags().GetString("direction")

			plan, err := sync.BuildPlan(left, right, parseDirection(direction), sync.Options{DryRun: true})
			exitOnError(err)

			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			exitOnError(enc.Encode(plan))
		},
	}
	planCmd.Flags().String("left", "", "left pane root")
	planCmd.Flags().String("right", "", "right pane root")
	planCmd.Flags().String("direction", "both", "sync direction: l2r, r2l, both")
	_ = planCmd.MarkFlagRequired("left")
	_ = planCmd.MarkFlagRequired("right")

	runCmd := &cobra.Command{
		Use:   "run",
		Short: "Execute a sync between two folders",
		Run: func(cmd *cobra.Command, _ []string) {
			left, _ := cmd.Flags().GetString("left")
			right, _ := cmd.Flags().GetString("right")
			direction, _ := cmd.Flags().GetString("direction")
			dryRun, _ := cmd.Flags().GetBool("dry-run")

			plan, err := sync.BuildPlan(left, right, parseDirection(direction), sync.Options{DryRun: dryRun})
			exitOnError(err)

			result, err := sync.Execute(plan, sync.Options{DryRun: dryRun})
			exitOnError(err)

			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			exitOnError(enc.Encode(result))
		},
	}
	runCmd.Flags().String("left", "", "left pane root")
	runCmd.Flags().String("right", "", "right pane root")
	runCmd.Flags().String("direction", "both", "sync direction: l2r, r2l, both")
	runCmd.Flags().Bool("dry-run", false, "show actions without writing")
	_ = runCmd.MarkFlagRequired("left")
	_ = runCmd.MarkFlagRequired("right")

	syncCmd.AddCommand(planCmd, runCmd)
	rootCmd.AddCommand(syncCmd)
}

func parseDirection(value string) sync.Direction {
	switch value {
	case "l2r", "left-to-right":
		return sync.DirectionLeftToRight
	case "r2l", "right-to-left":
		return sync.DirectionRightToLeft
	default:
		return sync.DirectionBidirectional
	}
}
