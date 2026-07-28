// Package sync implements two-pane folder synchronization planning and execution.
package sync

// Direction controls how changes flow between the left and right pane roots.
type Direction string

const (
	DirectionLeftToRight  Direction = "left-to-right"
	DirectionRightToLeft  Direction = "right-to-left"
	DirectionBidirectional Direction = "bidirectional"
)

// Action describes what should happen to a single relative path.
type Action string

const (
	ActionCopy     Action = "copy"
	ActionDelete   Action = "delete"
	ActionSkip     Action = "skip"
	ActionConflict Action = "conflict"
)

// PlanItem is one row in a sync plan shown to the user before execution.
type PlanItem struct {
	RelativePath string `json:"relativePath"`
	Action       Action `json:"action"`
	Source       string `json:"source"`
	Destination  string `json:"destination"`
	Reason       string `json:"reason"`
}

// Plan is the full diff between two pane roots.
type Plan struct {
	LeftRoot   string     `json:"leftRoot"`
	RightRoot  string     `json:"rightRoot"`
	Direction  Direction  `json:"direction"`
	Items      []PlanItem `json:"items"`
	Conflicts  int        `json:"conflicts"`
	ToCopy     int        `json:"toCopy"`
	ToDelete   int        `json:"toDelete"`
	ToSkip     int        `json:"toSkip"`
}

// ExecuteResult summarizes a completed sync run.
type ExecuteResult struct {
	Copied   int      `json:"copied"`
	Skipped  int      `json:"skipped"`
	Deleted  int      `json:"deleted"`
	Errors   []string `json:"errors"`
}

// Options tune planner and executor behavior.
type Options struct {
	DeleteExtraneous bool `json:"deleteExtraneous"`
	DryRun           bool `json:"dryRun"`
	UseChecksum      bool `json:"useChecksum"`
}
