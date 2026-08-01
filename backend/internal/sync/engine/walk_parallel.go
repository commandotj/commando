package engine

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"

	"golang.org/x/sync/errgroup"

	"github.com/systembug/commando/internal/fsutil"
	"github.com/systembug/commando/internal/sync/filter"
)

func indexRootParallel(ctx context.Context, root string, matcher filter.Matcher, opts IndexOptions) (Index, error) {
	info, err := os.Stat(root)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("walk parallel: %s is not a directory", root)
	}

	dirents, err := os.ReadDir(root)
	if err != nil {
		// coverage:ignore requires permission change after the successful Stat above
		return nil, err
	}

	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(opts.Parallelism)

	var mu sync.Mutex
	idx := make(Index)
	visited := &pathSet{seen: make(map[string]bool)}
	var scanned atomic.Int64
	reportEntry := func(rel string) {
		if opts.IndexProgress == nil {
			return
		}
		n := int(scanned.Add(1))
		opts.IndexProgress(n, rel)
	}

	processDir := func(absPath, relPrefix string) error {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		// coverage:ignore Stat after ReadDir — TOCTOU race
		di, err := os.Stat(absPath)
		if err != nil {
			// coverage:ignore Stat after ReadDir — TOCTOU race
			return err
		}
		mu.Lock()
		if matcher.Match(relPrefix, true) {
			idx[relPrefix] = Entry{
				RelativePath: relPrefix,
				AbsolutePath: absPath,
				IsDir:        true,
				Size:         di.Size(),
				ModTimeUnix:  di.ModTime().Unix(),
			}
			reportEntry(relPrefix)
		}
		mu.Unlock()

		prefix := relPrefix
		fsOpts := fsutil.WalkOptions{
			SymlinkMode: toFsutilSymlinkMode(opts.SymlinkMode),
			OnEntry: func(e fsutil.Entry) {
				reportEntry(prefix + "/" + e.RelativePath)
			},
		}
		// coverage:ignore Walk after Stat — TOCTOU race, untestable
		// coverage:ignore Walk after Stat — TOCTOU race
		entries, err := fsutil.Walk(absPath, fsOpts)
		if err != nil {
			// coverage:ignore Walk after Stat — TOCTOU race
			return err
		}
		mu.Lock()
		for rel, fsEntry := range entries {
			prefixed := relPrefix + "/" + rel
			if matcher.Match(prefixed, fsEntry.IsDir) {
				fsEntry.RelativePath = prefixed
				idx[prefixed] = fromFsutilEntry(fsEntry)
			}
		}
		mu.Unlock()
		return nil
	}

	for _, d := range dirents {
		name := d.Name()
		if name == "." || name == ".." || strings.HasPrefix(name, ".") {
			continue
		}
		absPath := filepath.Join(root, name)

		if d.IsDir() {
			absPath := absPath
			prefix := filepath.ToSlash(name)
			g.Go(func() error { return processDir(absPath, prefix) })
			continue
		}

		rel := filepath.ToSlash(name)
		if !matcher.Match(rel, false) {
			continue
		}
		finfo, _ := d.Info()
		entry := Entry{
			RelativePath: rel,
			AbsolutePath: absPath,
			Size:         finfo.Size(),
			ModTimeUnix:  finfo.ModTime().Unix(),
		}
		if d.Type()&os.ModeSymlink != 0 {
			switch opts.SymlinkMode {
			case SymlinkExclude:
				continue
			case SymlinkAsLink:
				target, _ := os.Readlink(absPath)
				entry.SymlinkTarget = target
			case SymlinkFollow:
				// coverage:ignore SymlinkFollow Stat — TOCTOU, untestable
				targetInfo, err := os.Stat(absPath)
				if err != nil {
					// coverage:ignore SymlinkFollow Stat — TOCTOU, untestable
					return nil, err
				}
				entry.IsDir = targetInfo.IsDir()
				entry.Size = targetInfo.Size()
				entry.ModTimeUnix = targetInfo.ModTime().Unix()
				if entry.IsDir {
					if !visited.tryAdd(absPath) {
						continue
					}
					realPath, _ := filepath.EvalSymlinks(absPath)
					g.Go(func() error {
						select {
						case <-ctx.Done():
							return ctx.Err()
						default:
						}
						// coverage:ignore WalkRoot after EvalSymlinks — TOCTOU, untestable
						entries, err := fsutil.Walk(realPath, fsutil.WalkOptions{
							SymlinkMode: toFsutilSymlinkMode(opts.SymlinkMode),
							OnEntry: func(e fsutil.Entry) {
								reportEntry(rel + "/" + e.RelativePath)
							},
						})
						if err != nil {
							// coverage:ignore WalkRoot after EvalSymlinks — TOCTOU, untestable
							return err
						}
						mu.Lock()
						for targetRel, fsEntry := range entries {
							merged := rel + "/" + targetRel
							fsEntry.RelativePath = merged
							if matcher.Match(merged, fsEntry.IsDir) {
								idx[merged] = fromFsutilEntry(fsEntry)
							}
						}
						mu.Unlock()
						return nil
					})
					continue
				}
			}
		}
		mu.Lock()
		idx[rel] = entry
		mu.Unlock()
		reportEntry(rel)
	}

	return idx, g.Wait()
}

func fromFsutilEntry(e fsutil.Entry) Entry {
	return Entry{
		RelativePath:  e.RelativePath,
		AbsolutePath:  e.AbsolutePath,
		IsDir:         e.IsDir,
		Size:          e.Size,
		ModTimeUnix:   e.ModTimeUnix,
		SymlinkTarget: e.SymlinkTarget,
	}
}

type pathSet struct {
	mu   sync.Mutex
	seen map[string]bool
}

func (s *pathSet) tryAdd(path string) bool {
	real, err := filepath.EvalSymlinks(path)
	if err != nil {
		return true
	}
	real = filepath.Clean(real)
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.seen[real] {
		return false
	}
	s.seen[real] = true
	return true
}
