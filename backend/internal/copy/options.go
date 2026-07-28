package copy

import "context"

// Progress reports batch copy state for UI or logging.
type Progress struct {
	ProcessedFiles int
	TotalFiles     int
	CurrentFile    string
	FileCopied     int64
	FileTotal      int64
}

// Options configures a batch copy run.
type Options struct {
	Context    context.Context
	OnProgress func(Progress)
}
