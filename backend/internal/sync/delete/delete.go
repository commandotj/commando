// Package delete implements file deletion strategies for sync operations:
// permanent (os.Remove), system trash, and timestamped versioning.
package delete

import (
	"context"
	"os"
)

// Method selects the deletion strategy.
type Method int

const (
	Permanent Method = iota
	Trash
	Versioning
)

// Delete removes path according to method. For Versioning, destDir is the
// target directory where the timestamped copy is placed; for Trash and
// Permanent it is ignored.
func Delete(ctx context.Context, path string, method Method, destDir string) error {
	switch method {
	case Permanent:
		return os.Remove(path)
	case Trash:
		return trash(ctx, path)
	case Versioning:
		return version(ctx, path, destDir)
	default:
		return os.Remove(path)
	}
}
