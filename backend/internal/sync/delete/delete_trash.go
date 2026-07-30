package delete

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

func trash(ctx context.Context, path string) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	switch runtime.GOOS {
	case "darwin":
		return trashDarwin(path)
	case "linux":
		return trashXDG(path)
	default:
		return fmt.Errorf("trash: unsupported platform %s", runtime.GOOS)
	}
}

func trashDarwin(path string) error {
	abs, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	script := fmt.Sprintf(
		`tell application "Finder" to delete POSIX file %q`,
		abs,
	)
	cmd := exec.Command("osascript", "-e", script)
	return cmd.Run()
}

func trashXDG(path string) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	trashDir := filepath.Join(home, ".local", "share", "Trash", "files")
	infoDir := filepath.Join(home, ".local", "share", "Trash", "info")
	_ = os.MkdirAll(trashDir, 0o700)
	_ = os.MkdirAll(infoDir, 0o700)

	dest := filepath.Join(trashDir, filepath.Base(path))
	if _, err := os.Stat(dest); err == nil {
		dest = uniquePath(dest)
	}
	return os.Rename(path, dest)
}

func uniquePath(path string) string {
	ext := filepath.Ext(path)
	base := path[:len(path)-len(ext)]
	for i := 1; i < 100; i++ {
		candidate := fmt.Sprintf("%s_%d%s", base, i, ext)
		if _, err := os.Stat(candidate); os.IsNotExist(err) {
			return candidate
		}
	}
	return path
}
