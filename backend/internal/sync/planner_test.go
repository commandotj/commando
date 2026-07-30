package sync_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/commandotj/commando/internal/sync"
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
