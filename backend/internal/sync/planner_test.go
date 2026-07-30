package sync_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/commandotj/commando/internal/sync"
	"github.com/commandotj/commando/internal/sync/filter"
)

func TestBuildPlan_LeftToRightCopiesMissingFile(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	leftFile := filepath.Join(left, "a.txt")
	if err := os.WriteFile(leftFile, []byte("left"), 0o644); err != nil {
		t.Fatal(err)
	}

	plan, err := sync.BuildPlan(left, right, sync.DirectionLeftToRight, sync.Options{})
	if err != nil {
		t.Fatal(err)
	}

	if plan.ToCopy != 1 {
		t.Fatalf("expected 1 copy, got %d", plan.ToCopy)
	}
	if plan.Items[0].Action != sync.ActionCopy {
		t.Fatalf("expected copy action, got %s", plan.Items[0].Action)
	}
}

func TestBuildPlan_BidirectionalUsesNewerSide(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	leftFile := filepath.Join(left, "shared.txt")
	rightFile := filepath.Join(right, "shared.txt")

	older := time.Now().Add(-time.Hour)
	newer := time.Now()

	if err := os.WriteFile(leftFile, []byte("new"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(rightFile, []byte("old"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Chtimes(leftFile, newer, newer); err != nil {
		t.Fatal(err)
	}
	if err := os.Chtimes(rightFile, older, older); err != nil {
		t.Fatal(err)
	}

	plan, err := sync.BuildPlan(left, right, sync.DirectionBidirectional, sync.Options{})
	if err != nil {
		t.Fatal(err)
	}

	if len(plan.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(plan.Items))
	}
	if plan.Items[0].Source != leftFile {
		t.Fatalf("expected left to win, got %s", plan.Items[0].Source)
	}
}

func TestBuildPlan_FilterExcludesFile(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	_ = os.WriteFile(filepath.Join(left, "include_me.txt"), []byte("a"), 0o644)
	_ = os.WriteFile(filepath.Join(left, "skip_me.tmp"), []byte("b"), 0o644)

	plan, err := sync.BuildPlan(left, right, sync.DirectionLeftToRight, sync.Options{
		Filter: filter.FilterRules{
			Include: []string{"**"},
			Exclude: []string{"*.tmp"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	for _, item := range plan.Items {
		if item.RelativePath == "skip_me.tmp" && item.Action != sync.ActionSkip {
			t.Errorf("expected skip_me.tmp to be excluded from plan, got action=%s", item.Action)
		}
	}
	if plan.ToCopy != 1 {
		t.Errorf("expected 1 copy (include_me.txt), got %d", plan.ToCopy)
	}
}

func TestBuildPlan_DefaultFilterExcludesGit(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	_ = os.MkdirAll(filepath.Join(left, ".git"), 0o755)
	_ = os.WriteFile(filepath.Join(left, ".git", "config"), []byte("x"), 0o644)
	_ = os.WriteFile(filepath.Join(left, "a.txt"), []byte("hello"), 0o644)

	plan, err := sync.BuildPlan(left, right, sync.DirectionLeftToRight, sync.Options{})
	if err != nil {
		t.Fatal(err)
	}

	for _, item := range plan.Items {
		if item.RelativePath == ".git/config" {
			t.Errorf("expected .git/config to be excluded by default filter")
		}
	}
	if plan.ToCopy != 1 {
		t.Errorf("expected 1 copy (a.txt), got copies=%d", plan.ToCopy)
	}
}
