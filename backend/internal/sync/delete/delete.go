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
	Versioning      // timestamped copy
	VersionReplace  // overwrite previous
)

// Delete removes path according to method. template is used by Versioning
// for path patterns (empty = default timestamp in destDir).
func Delete(ctx context.Context, path string, method Method, destDir string, template string) error {
	switch method {
	case Permanent:
		return os.Remove(path)
	case Trash:
		return trash(ctx, path)
	case Versioning:
		return version(ctx, path, destDir)
	case VersionReplace:
		return versionReplace(ctx, path, destDir)
	default:
		return os.Remove(path)
	}
}
