package engine

// CompareMode selects which attributes decide whether two entries are equal.
type CompareMode int

const (
	// TimeAndSize compares by modification time and size (FFS default).
	TimeAndSize CompareMode = iota
	// Content compares by binary content.
	Content
	// SizeOnly compares by size alone, ignoring modification time.
	SizeOnly
)

// SymlinkMode controls how a compare/index operation treats symbolic links.
// Mirrors fsutil.SymlinkMode's three modes at the sync-engine level.
type SymlinkMode int

const (
	SymlinkExclude SymlinkMode = iota
	SymlinkAsLink
	SymlinkFollow
)

// CompareSettings configures Equal and Categorize.
type CompareSettings struct {
	ToleranceSec int64
	SymlinkMode  SymlinkMode
	Parallelism  int
	CaseMode     CaseMode
}

// CaseMode controls case-sensitivity for path and name matching.
type CaseMode int

const (
	CaseSensitive   CaseMode = iota // exact match (case-sensitive volumes, Linux)
	CaseInsensitive                 // case-insensitive match (macOS HFS+/APFS default, Windows NTFS)
	CaseAuto                        // detect from filesystem (default)
)
