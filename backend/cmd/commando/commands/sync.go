package commands

import (
	"encoding/json"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/commandotj/commando/internal/sync"
	"github.com/commandotj/commando/internal/sync/filter"
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
			include, _ := cmd.Flags().GetString("include")
			exclude, _ := cmd.Flags().GetString("exclude")

			rules := filterRules(include, exclude)
			if err := rules.Validate(); err != nil {
				exitOnError(err)
			}

			plan, err := sync.BuildPlan(left, right, parseDirection(direction), sync.Options{
				DryRun: true,
				Filter: rules,
			})
			exitOnError(err)

			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			exitOnError(enc.Encode(plan))
		},
	}
	planCmd.Flags().String("left", "", "left pane root")
	planCmd.Flags().String("right", "", "right pane root")
	planCmd.Flags().String("direction", "both", "sync direction: l2r, r2l, both")
	planCmd.Flags().String("include", "", "include glob pattern (comma-separated, default: **)")
	planCmd.Flags().String("exclude", "", "exclude glob pattern (comma-separated)")
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
			include, _ := cmd.Flags().GetString("include")
			exclude, _ := cmd.Flags().GetString("exclude")

			rules := filterRules(include, exclude)
			if err := rules.Validate(); err != nil {
				exitOnError(err)
			}

			plan, err := sync.BuildPlan(left, right, parseDirection(direction), sync.Options{
				DryRun: dryRun,
				Filter: rules,
			})
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
	runCmd.Flags().String("include", "", "include glob pattern (comma-separated, default: **)")
	runCmd.Flags().String("exclude", "", "exclude glob pattern (comma-separated)")
	_ = runCmd.MarkFlagRequired("left")
	_ = runCmd.MarkFlagRequired("right")

	syncCmd.AddCommand(planCmd, runCmd)
	rootCmd.AddCommand(syncCmd)
}

func filterRules(include, exclude string) filter.FilterRules {
	rules := filter.DefaultRules()
	if include != "" {
		rules.Include = splitTrim(include)
	}
	if exclude != "" {
		rules.Exclude = splitTrim(exclude)
	}
	return rules
}

func splitTrim(s string) []string {
	parts := strings.Split(s, ",")
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
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
