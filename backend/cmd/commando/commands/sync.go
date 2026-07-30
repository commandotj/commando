package commands

import (
	"context"
	"encoding/json"
	"fmt"
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
		RunE: func(cmd *cobra.Command, _ []string) error {
			left, _ := cmd.Flags().GetString("left")
			right, _ := cmd.Flags().GetString("right")
			dirFlag, _ := cmd.Flags().GetString("direction")
			include, _ := cmd.Flags().GetString("include")
			exclude, _ := cmd.Flags().GetString("exclude")

			dir, err := parseDirection(dirFlag)
			if err != nil {
				return err
			}

			rules := filterRules(include, exclude)
			if err := rules.Validate(); err != nil {
				return err
			}

			plan, err := sync.BuildPlan(context.Background(), left, right, dir, sync.Options{
				DryRun: true,
				Filter: rules,
			})
			if err != nil {
				return err
			}

			enc := json.NewEncoder(os.Stdout)
			return enc.Encode(plan)
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
		RunE: func(cmd *cobra.Command, _ []string) error {
			left, _ := cmd.Flags().GetString("left")
			right, _ := cmd.Flags().GetString("right")
			dirFlag, _ := cmd.Flags().GetString("direction")
			dryRun, _ := cmd.Flags().GetBool("dry-run")
			include, _ := cmd.Flags().GetString("include")
			exclude, _ := cmd.Flags().GetString("exclude")

			dir, err := parseDirection(dirFlag)
			if err != nil {
				return err
			}

			rules := filterRules(include, exclude)
			if err := rules.Validate(); err != nil {
				return err
			}

			plan, err := sync.BuildPlan(context.Background(), left, right, dir, sync.Options{
				DryRun: dryRun,
				Filter: rules,
			})
			if err != nil {
				return err
			}

			result, err := sync.Execute(context.Background(), plan, sync.Options{DryRun: dryRun})
			if err != nil {
				return err
			}

			enc := json.NewEncoder(os.Stdout)
			if err := enc.Encode(result); err != nil {
				return err
			}
			if len(result.Errors) > 0 {
				return fmt.Errorf("%d errors", len(result.Errors))
			}
			return nil
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

func parseDirection(value string) (sync.Direction, error) {
	switch value {
	case "l2r", "left-to-right":
		return sync.DirectionLeftToRight, nil
	case "r2l", "right-to-left":
		return sync.DirectionRightToLeft, nil
	case "both", "bidirectional":
		return sync.DirectionBidirectional, nil
	default:
		return "", fmt.Errorf("unknown direction: %q (expected l2r, r2l, or both)", value)
	}
}
