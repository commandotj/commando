package filter

// FilterRules defines which relative paths a sync operation should include
// or exclude, mirroring FreeFileSync's include/exclude filter lists.
type FilterRules struct {
	Include []string
	Exclude []string
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
