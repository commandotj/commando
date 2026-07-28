package sync

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// Execute runs a sync plan. Skips conflict rows unless the caller resolved them first.
func Execute(plan *Plan, opts Options) (*ExecuteResult, error) {
	result := &ExecuteResult{}

	for _, item := range plan.Items {
		switch item.Action {
		case ActionSkip, ActionConflict:
			result.Skipped++
			continue
		case ActionCopy:
			if opts.DryRun {
				result.Copied++
				continue
			}
			if err := copyFile(item.Source, item.Destination); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", item.RelativePath, err))
				continue
			}
			result.Copied++
		case ActionDelete:
			if opts.DryRun {
				result.Deleted++
				continue
			}
			if err := os.Remove(item.Source); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", item.RelativePath, err))
				continue
			}
			result.Deleted++
		}
	}

	return result, nil
}

func copyFile(source, destination string) error {
	if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
		return err
	}

	src, err := os.Open(source)
	if err != nil {
		return err
	}
	defer src.Close()

	srcInfo, err := src.Stat()
	if err != nil {
		return err
	}

	dst, err := os.OpenFile(destination, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, srcInfo.Mode().Perm())
	if err != nil {
		return err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return err
	}

	return os.Chtimes(destination, srcInfo.ModTime(), srcInfo.ModTime())
}
