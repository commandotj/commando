package sync

import (
	"context"
	"path/filepath"
	"sort"

	"github.com/commandotj/commando/internal/sync/engine"
	"github.com/commandotj/commando/internal/sync/filter"
)

func BuildPlan(leftRoot, rightRoot string, direction Direction, opts Options) (*Plan, error) {
	leftRoot = filepath.Clean(leftRoot)
	rightRoot = filepath.Clean(rightRoot)

	rules := opts.Filter
	if len(rules.Include) == 0 {
		rules = filter.DefaultRules()
	}
	m := filter.NewMatcher(rules)

	engOpts := engine.IndexOptions{SymlinkMode: engine.SymlinkExclude}
	leftEntries, err := engine.IndexRoot(context.Background(), leftRoot, m, engOpts)
	if err != nil {
		return nil, err
	}
	rightEntries, err := engine.IndexRoot(context.Background(), rightRoot, m, engOpts)
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

func unionKeys(left, right engine.Index) []string {
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
	left, right engine.Entry,
	hasLeft, hasRight bool,
	leftRoot, rightRoot string,
	direction Direction,
	opts Options,
) PlanItem {
	// VAR-05: custom action overrides take priority
	cat, _, _ := engine.Categorize(
		entryPtr(left, hasLeft), entryPtr(right, hasRight),
		engine.TimeAndSize, engine.CompareSettings{},
	)
	if act, ok := opts.CustomActions[cat]; ok {
		return itemForAction(act, rel, left, right, leftRoot, rightRoot, hasLeft, hasRight)
	}

	switch {
	case hasLeft && !hasRight:
		return planMissingSide(rel, left, leftRoot, rightRoot, direction, opts, true)
	case !hasLeft && hasRight:
		return planMissingSide(rel, right, rightRoot, leftRoot, direction, opts, false)
	default:
		return planBothSides(rel, left, right, leftRoot, rightRoot, direction, opts)
	}
}

func entryPtr(e engine.Entry, has bool) *engine.Entry {
	if !has {
		return nil
	}
	return &e
}

func itemForAction(act Action, rel string, left, right engine.Entry, leftRoot, rightRoot string, hasLeft, hasRight bool) PlanItem {
	switch act {
	case ActionCopy:
		src, dest := left, filepath.Join(rightRoot, rel)
		if !hasLeft {
			src, dest = right, filepath.Join(leftRoot, rel)
		}
		return PlanItem{RelativePath: rel, Action: ActionCopy, Source: src.AbsolutePath, Destination: dest, Reason: "custom action"}
	case ActionDelete:
		if hasLeft {
			return PlanItem{RelativePath: rel, Action: ActionDelete, Source: left.AbsolutePath, Reason: "custom action"}
		}
		return PlanItem{RelativePath: rel, Action: ActionDelete, Source: right.AbsolutePath, Reason: "custom action"}
	case ActionConflict:
		return PlanItem{RelativePath: rel, Action: ActionConflict, Source: left.AbsolutePath, Reason: "custom action"}
	default:
		return PlanItem{RelativePath: rel, Action: ActionSkip, Reason: "custom action"}
	}
}

func planMissingSide(
	rel string,
	source engine.Entry,
	sourceRoot, destRoot string,
	direction Direction,
	opts Options,
	sourceIsLeft bool,
) PlanItem {
	if source.IsDir {
		return PlanItem{RelativePath: rel, Action: ActionSkip, Reason: "directory placeholder"}
	}

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
	left, right engine.Entry,
	leftRoot, rightRoot string,
	direction Direction,
	opts Options,
) PlanItem {
	if left.IsDir || right.IsDir {
		return PlanItem{RelativePath: rel, Action: ActionSkip, Reason: "directory already exists on both sides"}
	}

	mode := engine.TimeAndSize
	if opts.UseChecksum {
		mode = engine.Content
	}
	if eq, _ := engine.IsEqual(left, right, mode, engine.CompareSettings{}); eq {
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

func planBidirectional(rel string, left, right engine.Entry, leftRoot, rightRoot string) PlanItem {
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
