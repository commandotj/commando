package engine

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/commandotj/commando/internal/sync/filter"
)

func TestIndexRoot_SkipsGit(t *testing.T) {
	root := t.TempDir()
	writeIndexFile(t, filepath.Join(root, ".git", "config"), "gitconfig")
	writeIndexFile(t, filepath.Join(root, "a.txt"), "hello")

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()), IndexOptions{})
	if err != nil {
		t.Fatalf("IndexRoot returned error: %v", err)
	}

	if _, ok := idx["a.txt"]; !ok {
		t.Errorf("expected a.txt to be indexed, got keys %v", indexKeys(idx))
	}
	if _, ok := idx[".git/config"]; ok {
		t.Errorf("expected .git/config to be skipped")
	}
}

func TestIndexRoot_SkipsNodeModules(t *testing.T) {
	root := t.TempDir()
	writeIndexFile(t, filepath.Join(root, "node_modules", "x"), "module")
	writeIndexFile(t, filepath.Join(root, "a.txt"), "hello")

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()), IndexOptions{})
	if err != nil {
		t.Fatalf("IndexRoot returned error: %v", err)
	}

	if _, ok := idx["a.txt"]; !ok {
		t.Errorf("expected a.txt to be indexed, got keys %v", indexKeys(idx))
	}
	if _, ok := idx["node_modules/x"]; ok {
		t.Errorf("expected node_modules/x to be skipped")
	}
}

func TestIndexRoot_SymlinkExclude(t *testing.T) {
	root := t.TempDir()
	writeIndexFile(t, filepath.Join(root, "real.txt"), "hello")
	if err := os.Symlink(filepath.Join(root, "real.txt"), filepath.Join(root, "link.txt")); err != nil {
		t.Fatalf("Symlink failed: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()), IndexOptions{SymlinkMode: SymlinkExclude})
	if err != nil {
		t.Fatalf("IndexRoot returned error: %v", err)
	}

	if _, ok := idx["link.txt"]; ok {
		t.Errorf("expected link.txt to be excluded, got keys %v", indexKeys(idx))
	}
}

func TestIndexRoot_SymlinkAsLink(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "sub")
	writeIndexFile(t, filepath.Join(target, "file.txt"), "hello")
	if err := os.Symlink(target, filepath.Join(root, "link")); err != nil {
		t.Fatalf("Symlink failed: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()), IndexOptions{SymlinkMode: SymlinkAsLink})
	if err != nil {
		t.Fatalf("IndexRoot returned error: %v", err)
	}

	if _, ok := idx["link"]; !ok {
		t.Errorf("expected link to be indexed as its own entry, got keys %v", indexKeys(idx))
	}
	if _, ok := idx["link/file.txt"]; ok {
		t.Errorf("expected link target contents not to be traversed under SymlinkAsLink")
	}
}

func TestIndexRoot_SymlinkFollow(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "sub")
	writeIndexFile(t, filepath.Join(target, "file.txt"), "hello")
	if err := os.Symlink(target, filepath.Join(root, "link")); err != nil {
		t.Fatalf("Symlink failed: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()), IndexOptions{SymlinkMode: SymlinkFollow})
	if err != nil {
		t.Fatalf("IndexRoot returned error: %v", err)
	}

	if _, ok := idx["link/file.txt"]; !ok {
		t.Errorf("expected link/file.txt to be indexed via followed symlink, got keys %v", indexKeys(idx))
	}
}

func TestIndexRoot_AppliesMatcherExclusion(t *testing.T) {
	root := t.TempDir()
	writeIndexFile(t, filepath.Join(root, "keep.txt"), "hello")
	writeIndexFile(t, filepath.Join(root, "drop.txt"), "world")

	m := filter.NewMatcher(filter.FilterRules{Include: []string{"**"}, Exclude: []string{"drop.txt"}})
	idx, err := IndexRoot(context.Background(), root, m, IndexOptions{})
	if err != nil {
		t.Fatalf("IndexRoot returned error: %v", err)
	}

	if _, ok := idx["keep.txt"]; !ok {
		t.Errorf("expected keep.txt to be indexed, got keys %v", indexKeys(idx))
	}
	if _, ok := idx["drop.txt"]; ok {
		t.Errorf("expected drop.txt to be excluded by matcher, got keys %v", indexKeys(idx))
	}
}

func TestIndexRoot_NonExistentPath_ReturnsError(t *testing.T) {
	_, err := IndexRoot(context.Background(), filepath.Join(t.TempDir(), "does-not-exist"), filter.NewMatcher(filter.DefaultRules()), IndexOptions{})
	if err == nil {
		t.Fatal("expected error for non-existent root, got nil")
	}
}

func writeIndexFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll(%q) failed: %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("WriteFile(%q) failed: %v", path, err)
	}
}

func indexKeys(idx Index) []string {
	ks := make([]string, 0, len(idx))
	for k := range idx {
		ks = append(ks, k)
	}
	return ks
}
