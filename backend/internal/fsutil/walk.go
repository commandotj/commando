package fsutil

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// Entry holds metadata for one file or directory under a sync root.
type Entry struct {
	RelativePath string
	AbsolutePath string
	IsDir        bool
	Size         int64
	ModTimeUnix  int64
	// SymlinkTarget is the raw link target (via os.Readlink), non-empty only
	// when this entry is a symlink indexed under SymlinkAsLink mode.
	SymlinkTarget string
}

// SymlinkMode controls how Walk treats symbolic links.
type SymlinkMode int

const (
	// SymlinkExclude omits symlinks from the resulting index entirely.
	SymlinkExclude SymlinkMode = iota
	// SymlinkAsLink keeps the symlink as its own entry without following it,
	// recording where it points via Entry.SymlinkTarget.
	SymlinkAsLink
	// SymlinkFollow replaces a symlink entry with the contents of its target,
	// as if the target were physically located at the symlink's path.
	SymlinkFollow
)

// WalkOptions configures Walk behavior.
type WalkOptions struct {
	SymlinkMode SymlinkMode
}

// Walk indexes root according to opts. Unlike WalkRoot, it lets the caller
// choose how symlinks are handled instead of always following them.
func Walk(root string, opts WalkOptions) (map[string]Entry, error) {
	entries, err := WalkRoot(root)
	if err != nil {
		return nil, err
	}

	// Collect symlink entries first: the SymlinkFollow branch inserts new
	// keys into entries, and mutating a map while ranging over it gives
	// undefined iteration behavior for those new keys in Go.
	type symlinkRef struct {
		rel   string
		entry Entry
	}
	var symlinks []symlinkRef
	for rel, entry := range entries {
		isLink, lerr := isSymlink(entry.AbsolutePath)
		if lerr != nil {
			// coverage:ignore unreachable without a TOCTOU race (file must vanish
			// between WalkRoot's scan above and this Lstat call).
			return nil, lerr
		}
		if isLink {
			symlinks = append(symlinks, symlinkRef{rel, entry})
		}
	}

	for _, sl := range symlinks {
		switch opts.SymlinkMode {
		case SymlinkExclude:
			delete(entries, sl.rel)
		case SymlinkAsLink:
			target, rerr := os.Readlink(sl.entry.AbsolutePath)
			if rerr != nil {
				// coverage:ignore unreachable without a TOCTOU race (symlink must
				// vanish between isSymlink's Lstat and this Readlink call).
				return nil, rerr
			}
			sl.entry.SymlinkTarget = target
			entries[sl.rel] = sl.entry
		case SymlinkFollow:
			if err := followSymlink(entries, sl.rel, sl.entry); err != nil {
				return nil, err
			}
		}
	}

	return entries, nil
}

// followSymlink replaces entries[rel] with the resolved target's own entry
// (files) or merges the target directory's contents under rel/ (dirs).
func followSymlink(entries map[string]Entry, rel string, entry Entry) error {
	targetInfo, err := os.Stat(entry.AbsolutePath) // Stat follows symlinks
	if err != nil {
		return err
	}

	if !targetInfo.IsDir() {
		entry.IsDir = false
		entry.Size = targetInfo.Size()
		entry.ModTimeUnix = targetInfo.ModTime().Unix()
		entries[rel] = entry
		return nil
	}

	delete(entries, rel)
	// WalkRoot must be given the resolved target directory, not the symlink
	// path itself: filepath.WalkDir does not descend into a root that is
	// itself a symlink, it just reports the single leaf entry and stops.
	realTarget, err := filepath.EvalSymlinks(entry.AbsolutePath)
	if err != nil {
		// coverage:ignore unreachable without a TOCTOU race (symlink target must
		// vanish between the os.Stat above and this EvalSymlinks call).
		return err
	}
	targetEntries, err := WalkRoot(realTarget)
	if err != nil {
		// coverage:ignore unreachable without a TOCTOU race (resolved target
		// directory must vanish between EvalSymlinks and this WalkRoot call).
		return err
	}
	for targetRel, targetEntry := range targetEntries {
		mergedRel := rel + "/" + targetRel
		targetEntry.RelativePath = mergedRel
		entries[mergedRel] = targetEntry
	}
	return nil
}

func isSymlink(path string) (bool, error) {
	info, err := os.Lstat(path)
	if err != nil {
		// coverage:ignore unreachable in normal use — callers only ever pass paths
		// that WalkRoot itself just confirmed exist. Left as a real error
		// return (not a panic) because a TOCTOU race with an external
		// process is possible, however unlikely.
		return false, err
	}
	return info.Mode()&os.ModeSymlink != 0, nil
}

// WalkRoot indexes every file and directory under root using slash-separated relative paths.
func WalkRoot(root string) (map[string]Entry, error) {
	root = filepath.Clean(root)
	info, err := os.Stat(root)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, &fs.PathError{Op: "walk", Path: root, Err: fs.ErrInvalid}
	}

	entries := make(map[string]Entry)
	err = filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}

		rel, relErr := filepath.Rel(root, path)
		if relErr != nil {
			// coverage:ignore unreachable — path always comes from walking root
			// itself, so it is always relative to root by construction.
			return relErr
		}
		if rel == "." {
			return nil
		}

		rel = filepath.ToSlash(rel)
		if shouldSkip(rel) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		stat, statErr := d.Info()
		if statErr != nil {
			// coverage:ignore unreachable without a TOCTOU race (entry must vanish
			// between WalkDir listing it and this Info() call).
			return statErr
		}

		entries[rel] = Entry{
			RelativePath: rel,
			AbsolutePath: path,
			IsDir:        d.IsDir(),
			Size:         stat.Size(),
			ModTimeUnix:  stat.ModTime().Unix(),
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return entries, nil
}

func shouldSkip(rel string) bool {
	base := filepath.Base(rel)
	if strings.HasPrefix(base, ".") {
		return true
	}
	parts := strings.Split(rel, "/")
	for _, part := range parts {
		if part == "node_modules" || part == ".git" {
			return true
		}
	}
	return false
}
