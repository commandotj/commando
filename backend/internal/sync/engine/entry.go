package engine

// Entry describes one file or directory on either side of a sync, as seen
// through a single side's index.
type Entry struct {
	RelativePath  string
	AbsolutePath  string
	IsDir         bool
	Size          int64
	ModTimeUnix   int64
	SymlinkTarget string // non-empty only for symlinks indexed under SymlinkAsLink mode
}

// Index maps a relative path to its Entry for one side of a sync.
type Index map[string]Entry
