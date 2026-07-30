package sync

import (
	"path/filepath"
	"sort"

	"github.com/commandotj/commando/internal/fsutil"
)

// BuildPlan compares two pane roots and returns the actions required for the given direction.
func BuildPlan(leftRoot, rightRoot string, direction Direction, opts Options) (*Plan, error) {
	leftRoot = filepath.Clean(leftRoot)
	rightRoot = filepath.Clean(rightRoot)

	leftEntries, err := fsutil.WalkRoot(leftRoot)
	if err != nil {
		return nil, err
	}
	rightEntries, err := fsutil.WalkRoot(rightRoot)
	if err != nil {
		return nil, err
	}

	relPaths := unionKeys(leftEntries, rightEntries)
	sort.Strings(relPaths)

	plan := &Plan{
		LeftRoot:  leftRoot,
		RightRoot: rightRoot,
		Direction: direction,
		Items:     make([]PlanItem, 0, len(relPaths)),
	}

	for _, rel := range relPaths {
		left, hasLeft := leftEntries[rel]
		right, hasRight := rightEntries[rel]
		item := resolveItem(rel, left, right, hasLeft, hasRight, leftRoot, rightRoot, direction, opts)
		plan.Items = append(plan.Items, item)
		switch item.Action {
		case ActionCopy:
			plan.ToCopy++
		case ActionDelete:
			plan.ToDelete++
		case ActionConflict:
			plan.Conflicts++
		default:
			plan.ToSkip++
		}
	}

	return plan, nil
}

func unionKeys(left, right map[string]fsutil.Entry) []string {
	seen := make(map[string]struct{}, len(left)+len(right))
	for key := range left {
		seen[key] = struct{}{}
	}
	for key := range right {
		seen[key] = struct{}{}
	}
	keys := make([]string, 0, len(seen))
	for key := range seen {
		keys = append(keys, key)
	}
	return keys
}

func resolveItem(
	rel string,
	left, right fsutil.Entry,
	hasLeft, hasRight bool,
	leftRoot, rightRoot string,
	direction Direction,
	opts Options,
) PlanItem {
	switch {
	case hasLeft && !hasRight:
		return planMissingSide(rel, left, leftRoot, rightRoot, direction, opts, true)
	case !hasLeft && hasRight:
		return planMissingSide(rel, right, rightRoot, leftRoot, direction, opts, false)
	default:
		return planBothSides(rel, left, right, leftRoot, rightRoot, direction, opts)
	}
}

func planMissingSide(
	rel string,
	source fsutil.Entry,
	sourceRoot, destRoot string,
	direction Direction,
	opts Options,
	sourceIsLeft bool,
) PlanItem {
	if source.IsDir {
		return PlanItem{RelativePath: rel, Action: ActionSkip, Reason: "directory placeholder"}
	}

	// File only on one side.
	if direction == DirectionLeftToRight {
		if sourceIsLeft {
			return PlanItem{
				RelativePath: rel,
				Action:       ActionCopy,
				Source:       source.AbsolutePath,
				Destination:  filepath.Join(destRoot, rel),
				Reason:       "missing on right",
			}
		}
		if opts.DeleteExtraneous {
			return PlanItem{
				RelativePath: rel,
				Action:       ActionDelete,
				Source:       source.AbsolutePath,
				Reason:       "extraneous on right",
			}
		}
		return PlanItem{RelativePath: rel, Action: ActionSkip, Reason: "only on right; update strategy skips"}
	}

	if direction == DirectionRightToLeft {
		if !sourceIsLeft {
			return PlanItem{
				RelativePath: rel,
				Action:       ActionCopy,
				Source:       source.AbsolutePath,
				Destination:  filepath.Join(destRoot, rel),
				Reason:       "missing on left",
			}
		}
		if opts.DeleteExtraneous {
			return PlanItem{
				RelativePath: rel,
				Action:       ActionDelete,
				Source:       source.AbsolutePath,
				Reason:       "extraneous on left",
			}
		}
		return PlanItem{RelativePath: rel, Action: ActionSkip, Reason: "only on left; update strategy skips"}
	}

	// Bidirectional: copy missing file from the side that has it.
	return PlanItem{
		RelativePath: rel,
		Action:       ActionCopy,
		Source:       source.AbsolutePath,
		Destination:  filepath.Join(destRoot, rel),
		Reason:       "missing on other pane",
	}
}

func planBothSides(
	rel string,
	left, right fsutil.Entry,
	leftRoot, rightRoot string,
	direction Direction,
	opts Options,
) PlanItem {
	if left.IsDir || right.IsDir {
		return PlanItem{RelativePath: rel, Action: ActionSkip, Reason: "directory already exists on both sides"}
	}

	if entriesEqual(left, right, opts) {
		return PlanItem{RelativePath: rel, Action: ActionSkip, Reason: "already in sync"}
	}

	switch direction {
	case DirectionLeftToRight:
		return PlanItem{
			RelativePath: rel,
			Action:       ActionCopy,
			Source:       left.AbsolutePath,
			Destination:  filepath.Join(rightRoot, rel),
			Reason:       "left newer or different",
		}
	case DirectionRightToLeft:
		return PlanItem{
			RelativePath: rel,
			Action:       ActionCopy,
			Source:       right.AbsolutePath,
			Destination:  filepath.Join(leftRoot, rel),
			Reason:       "right newer or different",
		}
	default:
		return planBidirectional(rel, left, right, leftRoot, rightRoot)
	}
}

func planBidirectional(rel string, left, right fsutil.Entry, leftRoot, rightRoot string) PlanItem {
	switch {
	case left.ModTimeUnix > right.ModTimeUnix:
		return PlanItem{
			RelativePath: rel,
			Action:       ActionCopy,
			Source:       left.AbsolutePath,
			Destination:  filepath.Join(rightRoot, rel),
			Reason:       "left newer",
		}
	case right.ModTimeUnix > left.ModTimeUnix:
		return PlanItem{
			RelativePath: rel,
			Action:       ActionCopy,
			Source:       right.AbsolutePath,
			Destination:  filepath.Join(leftRoot, rel),
			Reason:       "right newer",
		}
	default:
		return PlanItem{
			RelativePath: rel,
			Action:       ActionConflict,
			Source:       left.AbsolutePath,
			Destination:  right.AbsolutePath,
			Reason:       "same mtime but different size",
		}
	}
}

func entriesEqual(left, right fsutil.Entry, opts Options) bool {
	if left.Size != right.Size {
		return false
	}
	if opts.UseChecksum {
		return false
	}
	return left.ModTimeUnix == right.ModTimeUnix
}
