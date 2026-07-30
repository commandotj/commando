package sync

import "fmt"

// StrategyID identifies a preset sync strategy shown in the UI.
type StrategyID string

const (
	StrategyMirrorRight StrategyID = "mirror-right"
	StrategyUpdateRight StrategyID = "update-right"
	StrategyMirrorLeft  StrategyID = "mirror-left"
	StrategyUpdateLeft  StrategyID = "update-left"
	StrategyTwoWay      StrategyID = "two-way"
)

// Strategy describes how compare/plan should treat the two pane roots.
type Strategy struct {
	ID               StrategyID `json:"id"`
	Direction        Direction  `json:"direction"`
	DeleteExtraneous bool       `json:"deleteExtraneous"`
	Label            string     `json:"label"`
	Description      string     `json:"description"`
}

var strategies = []Strategy{
	{
		ID:               StrategyMirrorRight,
		Direction:        DirectionLeftToRight,
		DeleteExtraneous: true,
		Label:            "Mirror → Right",
		Description:        "Left overwrites right; delete extras on right",
	},
	{
		ID:               StrategyUpdateRight,
		Direction:        DirectionLeftToRight,
		DeleteExtraneous: false,
		Label:            "Update → Right",
		Description:        "Copy newer or missing files from left to right",
	},
	{
		ID:               StrategyMirrorLeft,
		Direction:        DirectionRightToLeft,
		DeleteExtraneous: true,
		Label:            "Mirror → Left",
		Description:        "Right overwrites left; delete extras on left",
	},
	{
		ID:               StrategyUpdateLeft,
		Direction:        DirectionRightToLeft,
		DeleteExtraneous: false,
		Label:            "Update → Left",
		Description:        "Copy newer or missing files from right to left",
	},
	{
		ID:               StrategyTwoWay,
		Direction:        DirectionBidirectional,
		DeleteExtraneous: false,
		Label:            "Two-way sync",
		Description:        "Sync newer versions in both directions",
	},
}

// ListStrategies returns all built-in sync strategies.
func ListStrategies() []Strategy {
	out := make([]Strategy, len(strategies))
	copy(out, strategies)
	return out
}

// ResolveStrategy returns the strategy for id, or an error when unknown.
func ResolveStrategy(id StrategyID) (Strategy, error) {
	for _, strategy := range strategies {
		if strategy.ID == id {
			return strategy, nil
		}
	}
	return Strategy{}, fmt.Errorf("unknown sync strategy: %q", id)
}

// PlannerOptions merges strategy defaults with caller overrides.
func (s Strategy) PlannerOptions(overrides Options) Options {
	opts := Options{
		DryRun:      overrides.DryRun,
		UseChecksum: overrides.UseChecksum,
		Filter:      overrides.Filter,
	}
	if s.DeleteExtraneous {
		opts.DeleteExtraneous = true
		return opts
	}
	opts.DeleteExtraneous = overrides.DeleteExtraneous
	return opts
}

// Swap returns the strategy with left and right panes exchanged.
// Two-way is symmetric and returns itself unchanged.
func (s Strategy) Swap() Strategy {
	if s.Direction == DirectionBidirectional {
		return s
	}
	out := s
	switch s.Direction {
	case DirectionLeftToRight:
		out.Direction = DirectionRightToLeft
	case DirectionRightToLeft:
		out.Direction = DirectionLeftToRight
	}
	switch s.ID {
	case StrategyMirrorRight:
		out.ID = StrategyMirrorLeft
		out.Label = "Mirror → Left"
	case StrategyUpdateRight:
		out.ID = StrategyUpdateLeft
		out.Label = "Update → Left"
	case StrategyMirrorLeft:
		out.ID = StrategyMirrorRight
		out.Label = "Mirror → Right"
	case StrategyUpdateLeft:
		out.ID = StrategyUpdateRight
		out.Label = "Update → Right"
	}
	return out
}
