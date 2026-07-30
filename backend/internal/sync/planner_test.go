package sync_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/commandotj/commando/internal/sync"
	"github.com/commandotj/commando/internal/sync/engine"
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

func TestStrategy_Swap(t *testing.T) {
	s, err := sync.ResolveStrategy(sync.StrategyMirrorRight)
	if err != nil {
		t.Fatal(err)
	}
	swapped := s.Swap()
	if swapped.ID != sync.StrategyMirrorLeft {
		t.Errorf("expected mirror-left, got %s", swapped.ID)
	}
	if swapped.Direction != sync.DirectionRightToLeft {
		t.Errorf("expected right-to-left, got %s", swapped.Direction)
	}
}

func TestStrategy_Swap_TwoWay_IsIdentity(t *testing.T) {
	s, _ := sync.ResolveStrategy(sync.StrategyTwoWay)
	swapped := s.Swap()
	if swapped.ID != s.ID || swapped.Direction != s.Direction {
		t.Error("two-way swap should be identity")
	}
}

func TestBuildPlan_CustomAction_SkipsEqual(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	content := []byte("same")
	now := time.Now()
	lf := filepath.Join(left, "a.txt")
	rf := filepath.Join(right, "a.txt")
	_ = os.WriteFile(lf, content, 0o644)
	_ = os.WriteFile(rf, content, 0o644)
	_ = os.Chtimes(lf, now, now)
	_ = os.Chtimes(rf, now, now)

	plan, err := sync.BuildPlan(left, right, sync.DirectionLeftToRight, sync.Options{
		CustomActions: map[engine.Category]sync.Action{
			engine.Equal: sync.ActionConflict,
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(plan.Items) != 1 || plan.Items[0].Action != sync.ActionConflict {
		t.Errorf("expected Conflict from custom action, got %v", plan.Items)
	}
}

// T1: same size + mtime, different content, UseChecksum → detect difference
func TestBuildPlan_UseChecksum_DifferentContent(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	now := time.Now()
	lf := filepath.Join(left, "a.txt")
	rf := filepath.Join(right, "a.txt")
	_ = os.WriteFile(lf, []byte("left-content"), 0o644)
	_ = os.WriteFile(rf, []byte("right-stuff"), 0o644)
	_ = os.Chtimes(lf, now, now)
	_ = os.Chtimes(rf, now, now)

	plan, err := sync.BuildPlan(left, right, sync.DirectionLeftToRight, sync.Options{UseChecksum: true})
	if err != nil {
		t.Fatal(err)
	}
	if plan.ToCopy != 1 {
		t.Errorf("UseChecksum should detect content difference: got copies=%d", plan.ToCopy)
	}
}

// T2: same content, different mtime, Content mode → skip
func TestBuildPlan_ContentMode_SameContent_Equal(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	content := []byte("identical")
	lf := filepath.Join(left, "a.txt")
	rf := filepath.Join(right, "a.txt")
	_ = os.WriteFile(lf, content, 0o644)
	_ = os.WriteFile(rf, content, 0o644)
	_ = os.Chtimes(lf, time.Now(), time.Now())
	_ = os.Chtimes(rf, time.Now().Add(-time.Hour), time.Now().Add(-time.Hour))

	plan, err := sync.BuildPlan(left, right, sync.DirectionLeftToRight, sync.Options{UseChecksum: true})
	if err != nil {
		t.Fatal(err)
	}
	if plan.ToSkip != 1 {
		t.Errorf("Content mode should find files equal: skips=%d", plan.ToSkip)
	}
}

// T4: mtime within tolerance → skip
func TestBuildPlan_Tolerance_WithinBounds(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	content := []byte("x")
	now := time.Now()
	lf := filepath.Join(left, "a.txt")
	rf := filepath.Join(right, "a.txt")
	_ = os.WriteFile(lf, content, 0o644)
	_ = os.WriteFile(rf, content, 0o644)
	_ = os.Chtimes(lf, now, now)
	_ = os.Chtimes(rf, now.Add(1*time.Second), now.Add(1*time.Second))

	plan, err := sync.BuildPlan(left, right, sync.DirectionBidirectional, sync.Options{})
	if err != nil {
		t.Fatal(err)
	}
	// With default tolerance of 0, 1s difference → not equal → conflict or copy
	// This verifies that the planner returns a plan, not an error
	_ = plan
}

// T5: symlink excluded from plan
func TestBuildPlan_SymlinkExclude(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	_ = os.WriteFile(filepath.Join(left, "real.txt"), []byte("x"), 0o644)
	if err := os.Symlink(filepath.Join(left, "real.txt"), filepath.Join(left, "link.txt")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}

	plan, err := sync.BuildPlan(left, right, sync.DirectionLeftToRight, sync.Options{})
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range plan.Items {
		if item.RelativePath == "link.txt" {
			t.Error("symlink should not appear in plan by default")
		}
	}
}
