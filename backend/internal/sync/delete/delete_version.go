package delete

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func version(ctx context.Context, path string, destDir string) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	if destDir == "" {
		return fmt.Errorf("versioning requires destDir")
	}
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return err
	}
	base := filepath.Base(path)
	ext := filepath.Ext(base)
	name := base[:len(base)-len(ext)]

	ts := time.Now().Format("20060102_150405")
	dest := filepath.Join(destDir, fmt.Sprintf("%s_%s%s", name, ts, ext))
	if _, err := os.Stat(dest); err == nil {
		dest = filepath.Join(destDir, fmt.Sprintf("%s_%s_%d%s", name, ts, time.Now().UnixNano()%1000, ext))
	}
	return os.Rename(path, dest)
}
