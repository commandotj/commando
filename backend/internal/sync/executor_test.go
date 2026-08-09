package sync_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/systembug/commando/internal/sync"
)

func TestExecute_CopiesMissingEmptyDir(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	if err := os.Mkdir(filepath.Join(left, "empty"), 0o755); err != nil {
		t.Fatal(err)
	}

	plan, err := sync.BuildPlan(context.Background(), left, right, sync.DirectionLeftToRight, sync.Options{}, nil)
	if err != nil {
		t.Fatal(err)
	}

	result, err := sync.Execute(context.Background(), plan, sync.Options{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if result.Copied != 1 {
		t.Fatalf("expected 1 copied, got %d (errors: %v)", result.Copied, result.Errors)
	}

	info, statErr := os.Stat(filepath.Join(right, "empty"))
	if statErr != nil {
		t.Fatalf("expected dir created on right, stat failed: %v", statErr)
	}
	if !info.IsDir() {
		t.Fatalf("expected %s to be a directory", filepath.Join(right, "empty"))
	}
}
