package services

import "github.com/systembug/commando/internal/worker"

const (
	EventCopyBatchProgress = "copy-batch-progress"
	EventSyncProgress      = "sync-progress"
)

// EventEmitter pushes events to the Wails frontend.
type EventEmitter func(name string, payload any)

// Runtime wires background workers and event emission for desktop services.
type Runtime struct {
	Events EventEmitter
	Tasks  *worker.Runner
}

// NewRuntime creates a desktop runtime with bounded background concurrency.
func NewRuntime(emit EventEmitter, maxConcurrent int) *Runtime {
	if emit == nil {
		emit = func(string, any) {}
	}
	return &Runtime{
		Events: emit,
		Tasks:  worker.NewRunner(maxConcurrent),
	}
}
