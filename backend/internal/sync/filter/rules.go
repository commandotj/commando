package filter

import (
	"fmt"

	"github.com/bmatcuk/doublestar/v4"
)

// FilterRules defines which relative paths a sync operation should include
// or exclude, mirroring FreeFileSync's include/exclude filter lists.
type FilterRules struct {
	Include []string `json:"include"`
	Exclude []string `json:"exclude"`
}

// Validate checks that every glob pattern is syntactically valid. Returns nil
// on success, or an error wrapping the first invalid pattern encountered.
// (RFC-019 FLT-03: illegal glob must produce typed configuration error.)
func (r FilterRules) Validate() error {
	for _, p := range r.Include {
		if !doublestar.ValidatePattern(p) {
			return fmt.Errorf("invalid include pattern: %q", p)
		}
	}
	for _, p := range r.Exclude {
		if !doublestar.ValidatePattern(p) {
			return fmt.Errorf("invalid exclude pattern: %q", p)
		}
	}
	return nil
}

// DefaultRules returns Commando's default filter: include everything except
// well-known system/VCS/dependency directories that should never be synced
// (RFC-012 §4.5 FLT-04). node_modules/.git/hidden-file exclusion moved here
// from fsutil (RFC-012 §1.2) — fsutil only walks the filesystem, it does not
// decide what belongs in a sync.
func DefaultRules() FilterRules {
	return FilterRules{
		Include: []string{"**"},
		Exclude: []string{
			"$Recycle.Bin/**",
			"System Volume Information/**",
			"**/thumbs.db",
			".git/**",
			"node_modules/**",
			".*/**",
			".*",
		},
	}
}
