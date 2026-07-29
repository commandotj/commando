package engine

import (
	"github.com/systembugtj/commando/internal/fsutil"
	"github.com/systembugtj/commando/internal/sync/filter"
)

// IndexOptions configures IndexRoot's traversal.
type IndexOptions struct {
	SymlinkMode SymlinkMode
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
func IndexRoot(root string, matcher filter.Matcher, opts IndexOptions) (Index, error) {
	entries, err := fsutil.Walk(root, fsutil.WalkOptions{SymlinkMode: toFsutilSymlinkMode(opts.SymlinkMode)})
	if err != nil {
		return nil, err
	}

	idx := make(Index, len(entries))
	for rel, e := range entries {
		if !matcher.Match(rel, e.IsDir) {
			continue
		}
		idx[rel] = Entry{
			RelativePath: e.RelativePath,
			AbsolutePath: e.AbsolutePath,
			IsDir:        e.IsDir,
			Size:         e.Size,
			ModTimeUnix:  e.ModTimeUnix,
		}
	}
	return idx, nil
}
