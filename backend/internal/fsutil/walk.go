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
