package sync

import (
	"context"
	"time"
)

// ReportItem is one actionable row in a compare report.
type ReportItem struct {
	RelativePath string `json:"relativePath"`
	Action       Action `json:"action"`
	From         string `json:"from"`
	To           string `json:"to"`
	Reason       string `json:"reason"`
}

// CompareReport is the output of Compare: strategy context plus planned actions.
type CompareReport struct {
	Strategy    Strategy     `json:"strategy"`
	LeftRoot    string       `json:"leftRoot"`
	RightRoot   string       `json:"rightRoot"`
	GeneratedAt string       `json:"generatedAt"`
	Items       []ReportItem `json:"items"`
	Conflicts   int          `json:"conflicts"`
	ToCopy      int          `json:"toCopy"`
	ToDelete    int          `json:"toDelete"`
	ToSkip      int          `json:"toSkip"`
	Plan        Plan         `json:"plan"`
}

// BuildReport compares roots using a strategy id and returns a user-facing report.
func BuildReport(leftRoot, rightRoot string, strategyID StrategyID, overrides Options) (*CompareReport, error) {
	strategy, err := ResolveStrategy(strategyID)
	if err != nil {
		return nil, err
	}

	opts := strategy.PlannerOptions(overrides)
	plan, err := BuildPlan(context.Background(), leftRoot, rightRoot, strategy.Direction, opts)
	if err != nil {
		return nil, err
	}

	report := &CompareReport{
		Strategy:    strategy,
		LeftRoot:    plan.LeftRoot,
		RightRoot:   plan.RightRoot,
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Items:       make([]ReportItem, 0, len(plan.Items)),
		Conflicts:   plan.Conflicts,
		ToCopy:      plan.ToCopy,
		ToDelete:    plan.ToDelete,
		ToSkip:      plan.ToSkip,
		Plan:        *plan,
	}

	for _, item := range plan.Items {
		report.Items = append(report.Items, ReportItem{
			RelativePath: item.RelativePath,
			Action:       item.Action,
			From:         item.Source,
			To:           item.Destination,
			Reason:       item.Reason,
		})
	}

	return report, nil
}
