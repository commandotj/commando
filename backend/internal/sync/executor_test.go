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

// Regression: file copy must count exactly once in Copied — the ActionCopy
// path used to increment Copied twice for each successful file copy.
func TestExecute_FileCopy_CountsEachCopiedFileOnce(t *testing.T) {
	for _, tc := range []struct {
		name         string
		verifyCopies bool
	}{
		{name: "without verify", verifyCopies: false},
		{name: "with verify", verifyCopies: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			left := t.TempDir()
			right := t.TempDir()
			for _, name := range []string{"a.txt", "b.txt"} {
				if err := os.WriteFile(filepath.Join(left, name), []byte(name), 0o644); err != nil {
					t.Fatal(err)
				}
			}
			plan, err := sync.BuildPlan(context.Background(), left, right, sync.DirectionLeftToRight, sync.Options{}, nil)
			if err != nil {
				t.Fatal(err)
			}
			result, err := sync.Execute(context.Background(), plan, sync.Options{VerifyCopies: tc.verifyCopies}, nil)
			if err != nil {
				t.Fatal(err)
			}
			if result.Copied != 2 {
				t.Fatalf("expected 2 copied files counted once each, got %d (errors: %v)", result.Copied, result.Errors)
			}
			for _, name := range []string{"a.txt", "b.txt"} {
				if _, err := os.Stat(filepath.Join(right, name)); err != nil {
					t.Fatalf("expected %s on right after execute (verify=%v): %v", name, tc.verifyCopies, err)
				}
			}
		})
	}
}
