package engine

import (
	"context"

	"github.com/systembug/commando/internal/fsutil"
	"github.com/systembug/commando/internal/sync/filter"
)

// IndexOptions configures IndexRoot's traversal.
type IndexOptions struct {
	SymlinkMode SymlinkMode
	Parallelism int // >1 enables parallel sub-directory walk via errgroup
	// IndexProgress is called for each filesystem entry discovered (may be nil).
	IndexProgress func(scanned int, relPath string)
}

func toFsutilSymlinkMode(mode SymlinkMode) fsutil.SymlinkMode {
	switch mode {
	case SymlinkAsLink:
		return fsutil.SymlinkAsLink
	case SymlinkFollow:
		return fsutil.SymlinkFollow
	}
	return fsutil.SymlinkExclude
}

// IndexRoot walks root via fsutil and keeps only entries that pass matcher,
// producing a sync-engine Index. Filtering decisions (what belongs in a
// sync) live in filter.Matcher; fsutil only knows how to read the
// filesystem (RFC-012 §1.2).
//
// The ctx parameter is reserved for cancellation and parallelism (CMP-10);
// it is not yet wired through fsutil.Walk.
func IndexRoot(ctx context.Context, root string, matcher filter.Matcher, opts IndexOptions) (Index, error) {
	if opts.Parallelism > 1 {
		return indexRootParallel(ctx, root, matcher, opts)
	}

	scanned := 0
	entries, err := fsutil.Walk(root, fsutil.WalkOptions{
		SymlinkMode: toFsutilSymlinkMode(opts.SymlinkMode),
		OnEntry: func(e fsutil.Entry) {
			scanned++
			if opts.IndexProgress != nil {
				opts.IndexProgress(scanned, e.RelativePath)
			}
		},
	})
	if err != nil {
		return nil, err
	}

	idx := make(Index, len(entries))
	for rel, e := range entries {
		if !matcher.Match(rel, e.IsDir) {
			continue
		}
		idx[rel] = Entry{
			RelativePath:  e.RelativePath,
			AbsolutePath:  e.AbsolutePath,
			IsDir:         e.IsDir,
			Size:          e.Size,
			ModTimeUnix:   e.ModTimeUnix,
			SymlinkTarget: e.SymlinkTarget,
		}
	}
	return idx, nil
}
