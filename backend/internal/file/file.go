package file

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Entry is one directory listing row.
type Entry struct {
	Name        string `json:"name"`
	IsDirectory bool   `json:"isDirectory"`
	Size        int64  `json:"size"`
	Mtime       int64  `json:"mtime"`
	IsHidden    bool   `json:"isHidden,omitempty"`
}

// ListOptions controls directory listing.
type ListOptions struct {
	IncludeHidden      bool   `json:"includeHidden"`
	SortBy             string `json:"sortBy"`
	SortOrder          string `json:"sortOrder"`
	IncludePermissions bool   `json:"includePermissions"`
}

// NavigationResult is returned by navigation helpers.
type NavigationResult struct {
	Success bool    `json:"success"`
	Path    string  `json:"path"`
	Entries []Entry `json:"entries"`
}

// ListDir returns sorted entries for a path.
func ListDir(path string, options ListOptions) ([]Entry, error) {
	path = filepath.Clean(path)
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	result := make([]Entry, 0, len(entries))
	for _, entry := range entries {
		name := entry.Name()
		if name == "." || name == ".." {
			continue
		}
		if !options.IncludeHidden && strings.HasPrefix(name, ".") {
			continue
		}

		info, infoErr := entry.Info()
		if infoErr != nil {
			return nil, infoErr
		}

		result = append(result, Entry{
			Name:        name,
			IsDirectory: entry.IsDir(),
			Size:        info.Size(),
			Mtime:       info.ModTime().Unix(),
			IsHidden:    strings.HasPrefix(name, "."),
		})
	}

	sortEntries(result, options)
	return result, nil
}

// Navigate lists a directory path.
func Navigate(path string) (NavigationResult, error) {
	entries, err := ListDir(path, ListOptions{})
	if err != nil {
		return NavigationResult{Success: false, Path: path}, err
	}
	return NavigationResult{Success: true, Path: filepath.Clean(path), Entries: entries}, nil
}

// HomeDir returns the user home directory.
func HomeDir() (string, error) {
	return os.UserHomeDir()
}

// ParentDir returns the parent of a path.
func ParentDir(path string) (string, error) {
	path = filepath.Clean(path)
	parent := filepath.Dir(path)
	if parent == path {
		return path, nil
	}
	return parent, nil
}

// GoToParent navigates to the parent directory.
func GoToParent(path string) (NavigationResult, error) {
	parent, err := ParentDir(path)
	if err != nil {
		return NavigationResult{Success: false, Path: path}, err
	}
	return Navigate(parent)
}

func sortEntries(entries []Entry, options ListOptions) {
	order := 1
	if options.SortOrder == "desc" {
		order = -1
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDirectory != entries[j].IsDirectory {
			return entries[i].IsDirectory
		}

		switch options.SortBy {
		case "size":
			if entries[i].Size == entries[j].Size {
				return entries[i].Name < entries[j].Name
			}
			return (entries[i].Size < entries[j].Size) == (order == 1)
		case "mtime":
			if entries[i].Mtime == entries[j].Mtime {
				return entries[i].Name < entries[j].Name
			}
			return (entries[i].Mtime < entries[j].Mtime) == (order == 1)
		default:
			return (entries[i].Name < entries[j].Name) == (order == 1)
		}
	})
}
