package worker

import (
	"context"
	"errors"
	"sync"
)

const DefaultMaxConcurrent = 4

var ErrTaskAlreadyRunning = errors.New("task already running")

// Runner executes heavy work off the caller goroutine with bounded concurrency.
type Runner struct {
	maxConcurrent int
	sem           chan struct{}
	mu            sync.Mutex
	cancels       map[string]context.CancelFunc
}

// NewRunner creates a runner that limits concurrent background jobs.
func NewRunner(maxConcurrent int) *Runner {
	if maxConcurrent < 1 {
		maxConcurrent = DefaultMaxConcurrent
	}
	return &Runner{
		maxConcurrent: maxConcurrent,
		sem:           make(chan struct{}, maxConcurrent),
		cancels:       make(map[string]context.CancelFunc),
	}
}

// Start launches fn in a background goroutine. Returns immediately.
func (r *Runner) Start(taskID string, fn func(ctx context.Context) error) error {
	r.mu.Lock()
	if _, exists := r.cancels[taskID]; exists {
		r.mu.Unlock()
		return ErrTaskAlreadyRunning
	}

	ctx, cancel := context.WithCancel(context.Background())
	r.cancels[taskID] = cancel
	r.mu.Unlock()

	go func() {
		r.sem <- struct{}{}
		defer func() { <-r.sem }()
		defer r.remove(taskID)

		_ = fn(ctx)
	}()

	return nil
}

// Cancel stops a running task by ID.
func (r *Runner) Cancel(taskID string) bool {
	r.mu.Lock()
	cancel, ok := r.cancels[taskID]
	r.mu.Unlock()
	if !ok {
		return false
	}
	cancel()
	return true
}

// ActiveCount returns the number of tracked (running or queued) tasks.
func (r *Runner) ActiveCount() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.cancels)
}

func (r *Runner) remove(taskID string) {
	r.mu.Lock()
	delete(r.cancels, taskID)
	r.mu.Unlock()
}
