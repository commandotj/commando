package copy

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

// BatchResult is returned after a batch copy completes.
type BatchResult struct {
	BatchID string `json:"batchId"`
}

// Batch copies sources into a destination directory (blocking).
func Batch(sources []string, destination string) (BatchResult, error) {
	return BatchWithOptions(sources, destination, Options{Context: context.Background()})
}

// BatchWithOptions copies sources with cancellation and progress callbacks.
func BatchWithOptions(sources []string, destination string, opts Options) (BatchResult, error) {
	if len(sources) == 0 {
		return BatchResult{}, fmt.Errorf("no sources provided")
	}

	ctx := opts.Context
	if ctx == nil {
		ctx = context.Background()
	}

	batchID := uuid.NewString()
	destDir := filepath.Clean(destination)

	totalFiles, err := countFiles(ctx, sources)
	if err != nil {
		return BatchResult{}, err
	}

	processed := 0
	emit := func(currentFile string, fileCopied, fileTotal int64) {
		if opts.OnProgress == nil {
			return
		}
		opts.OnProgress(Progress{
			ProcessedFiles: processed,
			TotalFiles:     totalFiles,
			CurrentFile:    currentFile,
			FileCopied:     fileCopied,
			FileTotal:      fileTotal,
		})
	}

	for _, source := range sources {
		if err := ctx.Err(); err != nil {
			return BatchResult{}, err
		}

		source = filepath.Clean(source)
		info, err := os.Stat(source)
		if err != nil {
			return BatchResult{}, err
		}

		target := filepath.Join(destDir, filepath.Base(source))
		if info.IsDir() {
			if err := copyDirWithOptions(ctx, source, target, &processed, emit); err != nil {
				return BatchResult{}, err
			}
			continue
		}

		if err := copyFileWithProgress(ctx, source, target, &processed, emit); err != nil {
			return BatchResult{}, err
		}
	}

	return BatchResult{BatchID: batchID}, nil
}

func countFiles(ctx context.Context, sources []string) (int, error) {
	total := 0
	for _, source := range sources {
		if err := ctx.Err(); err != nil {
			return 0, err
		}

		source = filepath.Clean(source)
		info, err := os.Stat(source)
		if err != nil {
			return 0, err
		}
		if !info.IsDir() {
			total++
			continue
		}

		walkErr := filepath.WalkDir(source, func(path string, entry os.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if err := ctx.Err(); err != nil {
				return err
			}
			if !entry.IsDir() {
				total++
			}
			return nil
		})
		if walkErr != nil {
			return 0, walkErr
		}
	}
	return total, nil
}

func copyDirWithOptions(
	ctx context.Context,
	source, destination string,
	processed *int,
	emit func(string, int64, int64),
) error {
	return filepath.WalkDir(source, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if err := ctx.Err(); err != nil {
			return err
		}

		rel, relErr := filepath.Rel(source, path)
		if relErr != nil {
			return relErr
		}
		target := filepath.Join(destination, rel)

		if entry.IsDir() {
			return os.MkdirAll(target, 0o755)
		}

		return copyFileWithProgress(ctx, path, target, processed, emit)
	})
}

func copyFileWithProgress(
	ctx context.Context,
	source, destination string,
	processed *int,
	emit func(string, int64, int64),
) error {
	if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
		return err
	}

	src, err := os.Open(source)
	if err != nil {
		return err
	}
	defer src.Close()

	info, err := src.Stat()
	if err != nil {
		return err
	}

	dst, err := os.OpenFile(destination, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode().Perm())
	if err != nil {
		return err
	}
	defer dst.Close()

	total := info.Size()
	emit(source, 0, total)

	buf := make([]byte, 32*1024)
	var copied int64
	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		n, readErr := src.Read(buf)
		if n > 0 {
			if _, writeErr := dst.Write(buf[:n]); writeErr != nil {
				return writeErr
			}
			copied += int64(n)
			emit(source, copied, total)
		}
		if readErr != nil {
			if errors.Is(readErr, io.EOF) {
				break
			}
			return readErr
		}
	}

	modTime := info.ModTime()
	if modTime.IsZero() {
		modTime = time.Now()
	}
	if err := os.Chtimes(destination, modTime, modTime); err != nil {
		return err
	}

	*processed++
	emit(source, total, total)
	return nil
}

func copyFile(source, destination string) error {
	return copyFileWithProgress(context.Background(), source, destination, new(int), func(string, int64, int64) {})
}

func copyDir(source, destination string) error {
	return copyDirWithOptions(context.Background(), source, destination, new(int), func(string, int64, int64) {})
}
