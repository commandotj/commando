package sync

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	dels "github.com/commandotj/commando/internal/sync/delete"
)

// Execute runs a sync plan. ErrorMode="stop" aborts on first failure.
func Execute(ctx context.Context, plan *Plan, opts Options) (*ExecuteResult, error) {
	result := &ExecuteResult{}

	for _, item := range plan.Items {
		select {
		case <-ctx.Done():
			return result, ctx.Err()
		default:
		}
		switch item.Action {
		case ActionSkip, ActionConflict:
			result.Skipped++
			continue
		case ActionCopy:
			if opts.DryRun {
				result.Copied++
				continue
			}
			cpErr := copyFileAtomic(item.Source, item.Destination)
			if cpErr != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", item.RelativePath, cpErr))
				if opts.ErrorMode == "stop" {
					return result, fmt.Errorf("copy %s: %w", item.RelativePath, cpErr)
				}
				continue
			}
			if opts.VerifyCopies {
				if !filesEqual(item.Source, item.Destination) {
					result.Errors = append(result.Errors, fmt.Sprintf("%s: verify failed", item.RelativePath))
					if opts.ErrorMode == "stop" {
						return result, fmt.Errorf("verify %s: mismatch", item.RelativePath)
					}
					continue
				}
			}
			result.Copied++
		case ActionDelete:
			if opts.DryRun {
				result.Deleted++
				continue
			}
			method := deleteMethod(opts.DeleteMethod)
			if err := dels.Delete(ctx, item.Source, method, opts.VersionDir); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", item.RelativePath, err))
				if opts.ErrorMode == "stop" {
					return result, fmt.Errorf("delete %s: %w", item.RelativePath, err)
				}
				continue
			}
			result.Deleted++
		}
	}

	return result, nil
}

// copyFileAtomic copies source to a temporary file next to destination, then
// renames it atomically. Destination mode and mtime are preserved from source.
func copyFileAtomic(source, destination string) error {
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

	tmpPath := destination + ".commando-tmp"
	dst, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, srcInfo.Mode().Perm())
	if err != nil {
		return err
	}
	_, copyErr := io.Copy(dst, src)
	dst.Close()
	if copyErr != nil {
		os.Remove(tmpPath)
		return copyErr
	}

	if err := os.Chtimes(tmpPath, srcInfo.ModTime(), srcInfo.ModTime()); err != nil {
		os.Remove(tmpPath)
		return err
	}

	return os.Rename(tmpPath, destination)
}

func filesEqual(a, b string) bool {
	fa, err := os.Open(a)
	if err != nil {
		return false
	}
	defer fa.Close()
	fb, err := os.Open(b)
	if err != nil {
		return false
	}
	defer fb.Close()

	bufA := make([]byte, 64*1024)
	bufB := make([]byte, 64*1024)
	for {
		na, _ := fa.Read(bufA)
		nb, _ := fb.Read(bufB)
		if na != nb || !bytes.Equal(bufA[:na], bufB[:nb]) {
			return false
		}
		if na == 0 {
			return true
		}
	}
}

func deleteMethod(s string) dels.Method {
	switch s {
	case "trash":
		return dels.Trash
	case "versioning":
		return dels.Versioning
	default:
		return dels.Permanent
	}
}
