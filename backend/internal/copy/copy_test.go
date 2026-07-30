package copy_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/commandotj/commando/internal/copy"
)

func TestBatchWithOptions_Cancel(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	source := filepath.Join(dir, "source.txt")
	if err := os.WriteFile(source, make([]byte, 1024*1024), 0o644); err != nil {
		t.Fatalf("write source: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := copy.BatchWithOptions([]string{source}, filepath.Join(dir, "out"), copy.Options{
		Context: ctx,
	})
	if err == nil {
		t.Fatal("expected cancellation error")
	}
}

func TestBatchWithOptions_Progress(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	source := filepath.Join(dir, "a.txt")
	if err := os.WriteFile(source, []byte("hello"), 0o644); err != nil {
		t.Fatalf("write source: %v", err)
	}

	progressCh := make(chan copy.Progress, 1)
	_, err := copy.BatchWithOptions([]string{source}, filepath.Join(dir, "out"), copy.Options{
		Context: context.Background(),
		OnProgress: func(progress copy.Progress) {
			select {
			case progressCh <- progress:
			default:
			}
		},
	})
	if err != nil {
		t.Fatalf("batch: %v", err)
	}

	select {
	case <-progressCh:
	case <-time.After(2 * time.Second):
		t.Fatal("expected progress callback")
	}
}
