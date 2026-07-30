package worker_test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/commandotj/commando/internal/worker"
)

func TestRunner_StartAndFinish(t *testing.T) {
	r := worker.NewRunner(2)
	done := make(chan struct{})

	if err := r.Start("task-1", func(ctx context.Context) error {
		close(done)
		return nil
	}); err != nil {
		t.Fatalf("start: %v", err)
	}

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("task did not finish")
	}

	deadline := time.Now().Add(2 * time.Second)
	for r.ActiveCount() > 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if r.ActiveCount() != 0 {
		t.Fatalf("expected active count 0, got %d", r.ActiveCount())
	}
}

func TestRunner_Cancel(t *testing.T) {
	r := worker.NewRunner(1)
	var cancelled atomic.Bool

	if err := r.Start("task-1", func(ctx context.Context) error {
		<-ctx.Done()
		cancelled.Store(true)
		return ctx.Err()
	}); err != nil {
		t.Fatalf("start: %v", err)
	}

	if !r.Cancel("task-1") {
		t.Fatal("expected cancel to succeed")
	}

	deadline := time.Now().Add(2 * time.Second)
	for !cancelled.Load() && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if !cancelled.Load() {
		t.Fatal("task was not cancelled")
	}
}

func TestRunner_DuplicateTaskID(t *testing.T) {
	r := worker.NewRunner(1)
	block := make(chan struct{})

	if err := r.Start("dup", func(ctx context.Context) error {
		<-block
		return nil
	}); err != nil {
		t.Fatalf("first start: %v", err)
	}

	if err := r.Start("dup", func(ctx context.Context) error { return nil }); err != worker.ErrTaskAlreadyRunning {
		t.Fatalf("expected duplicate error, got %v", err)
	}

	close(block)
}
