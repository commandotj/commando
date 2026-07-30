package engine

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/commandotj/commando/internal/sync/filter"
)

func TestIndexRoot_ParallelAndSerialSame(t *testing.T) {
	root := t.TempDir()
	writeIndexFile(t, filepath.Join(root, "a.txt"), "hello")
	writeIndexFile(t, filepath.Join(root, "sub1", "b.txt"), "world")
	writeIndexFile(t, filepath.Join(root, "sub1", "c.txt"), "foo")
	writeIndexFile(t, filepath.Join(root, "sub2", "d.txt"), "bar")

	m := filter.NewMatcher(filter.DefaultRules())

	serial, err := IndexRoot(context.Background(), root, m, IndexOptions{})
	if err != nil {
		t.Fatalf("serial IndexRoot: %v", err)
	}

	parallel, err := IndexRoot(context.Background(), root, m, IndexOptions{Parallelism: 4})
	if err != nil {
		t.Fatalf("parallel IndexRoot: %v", err)
	}

	if len(serial) != len(parallel) {
		t.Errorf("serial=%d parallel=%d entries", len(serial), len(parallel))
	}
	for k, se := range serial {
		pe, ok := parallel[k]
		if !ok {
			t.Errorf("parallel missing key %q", k)
			continue
		}
		if se.RelativePath != pe.RelativePath || se.Size != pe.Size {
			t.Errorf("key %q: serial=%+v parallel=%+v", k, se, pe)
		}
	}
}

func TestIndexRoot_ParallelCancellation(t *testing.T) {
	root := t.TempDir()
	writeIndexFile(t, filepath.Join(root, "a.txt"), "x")
	writeIndexFile(t, filepath.Join(root, "deep", "b.txt"), "y")

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	_, err := IndexRoot(ctx, root, filter.NewMatcher(filter.DefaultRules()), IndexOptions{Parallelism: 4})
	if err == nil {
		t.Error("expected context error after cancellation")
	}
}

func TestParallelCompare_ContentBatch(t *testing.T) {
	dir := t.TempDir()
	a1 := writeTempFile(t, dir, "a1.txt", "same")
	b1 := writeTempFile(t, dir, "b1.txt", "same")
	a2 := writeTempFile(t, dir, "a2.txt", "diffA")
	b2 := writeTempFile(t, dir, "b2.txt", "diffB")
	a3 := writeTempFile(t, dir, "a3.txt", "hello")
	b3 := writeTempFile(t, dir, "b3.txt", "hello")

	pairs := []ComparePair{
		{Entry{AbsolutePath: a1}, Entry{AbsolutePath: b1}},
		{Entry{AbsolutePath: a2}, Entry{AbsolutePath: b2}},
		{Entry{AbsolutePath: a3}, Entry{AbsolutePath: b3}},
	}

	results := ParallelCompare(context.Background(), pairs, Content, CompareSettings{Parallelism: 3})
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}
	if !results[0] {
		t.Error("pair 0 (same) should be equal")
	}
	if results[1] {
		t.Error("pair 1 (different) should not be equal")
	}
	if !results[2] {
		t.Error("pair 2 (hello) should be equal")
	}
}

func TestParallelCompare_TimeAndSize(t *testing.T) {
	pairs := []ComparePair{
		{Entry{Size: 10, ModTimeUnix: 100}, Entry{Size: 10, ModTimeUnix: 101}},
		{Entry{Size: 10, ModTimeUnix: 100}, Entry{Size: 20, ModTimeUnix: 100}},
	}
	results := ParallelCompare(context.Background(), pairs, TimeAndSize, CompareSettings{ToleranceSec: 2, Parallelism: 2})
	if !results[0] {
		t.Error("pair 0 (within 2s tolerance) should be equal")
	}
	if results[1] {
		t.Error("pair 1 (different size) should not be equal")
	}
}

func TestParallelCompare_SizeOnly(t *testing.T) {
	pairs := []ComparePair{
		{Entry{Size: 5, ModTimeUnix: 1}, Entry{Size: 5, ModTimeUnix: 99}},
		{Entry{Size: 5, ModTimeUnix: 1}, Entry{Size: 6, ModTimeUnix: 1}},
	}
	results := ParallelCompare(context.Background(), pairs, SizeOnly, CompareSettings{Parallelism: 2})
	if !results[0] {
		t.Error("pair 0 (same size) should be equal")
	}
	if results[1] {
		t.Error("pair 1 (different size) should not be equal")
	}
}

func TestParallelCompare_EmptyList(t *testing.T) {
	results := ParallelCompare(context.Background(), nil, Content, CompareSettings{})
	if results != nil {
		t.Errorf("expected nil for empty input, got %v", results)
	}
}

// CMP-13: Unicode round-trip
func TestIndexRoot_UnicodePaths(t *testing.T) {
	root := t.TempDir()
	dirName := "日本語"
	fileName := "résumé.txt"
	absDir := filepath.Join(root, dirName)
	if err := os.MkdirAll(absDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(absDir, fileName), []byte("content"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "café.txt"), []byte("coffee"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	m := filter.NewMatcher(filter.DefaultRules())
	idx, err := IndexRoot(context.Background(), root, m, IndexOptions{})
	if err != nil {
		t.Fatalf("IndexRoot: %v", err)
	}

	keyDir := "日本語/résumé.txt"
	if _, ok := idx[keyDir]; !ok {
		t.Errorf("expected key %q, got keys %v", keyDir, indexKeys(idx))
	}
	if _, ok := idx["café.txt"]; !ok {
		t.Errorf("expected café.txt")
	}
}

// CMP-14: CaseMode unit matrix
func TestCompareSettings_CaseMode_Defaults(t *testing.T) {
	s := CompareSettings{}
	if s.CaseMode != CaseSensitive {
		t.Error("zero-value CaseMode should be CaseSensitive")
	}
}

func TestCompareSettings_CaseMode_Values(t *testing.T) {
	cases := []struct {
		mode   CaseMode
		label  string
		zeroOK bool
	}{
		{CaseSensitive, "CaseSensitive", true},
		{CaseInsensitive, "CaseInsensitive", false},
		{CaseAuto, "CaseAuto", false},
	}
	for _, c := range cases {
		if c.zeroOK != (c.mode == 0) {
			t.Errorf("%s: zero check mismatch", c.label)
		}
	}
	if CaseSensitive != 0 {
		t.Error("CaseSensitive must be zero value")
	}
}

// CMP-07: symlink cycle detection (path-based)
func TestIndexRoot_ParallelSymlinkCycle(t *testing.T) {
	root := t.TempDir()
	writeIndexFile(t, filepath.Join(root, "a.txt"), "hello")

	// Create a symlink that points to root itself (cycle)
	if err := os.Symlink(root, filepath.Join(root, "cycle")); err != nil {
		t.Skipf("symlink unsupported or failed: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{SymlinkMode: SymlinkFollow, Parallelism: 2})
	if err != nil {
		t.Fatalf("IndexRoot with cycle: %v", err)
	}
	if _, ok := idx["a.txt"]; !ok {
		t.Errorf("expected a.txt")
	}
}

func TestIndexRoot_ParallelSymlinkAsLink_toplevel(t *testing.T) {
	root := t.TempDir()
	writeTempFile(t, root, "real.txt", "hello")
	if err := os.Symlink(filepath.Join(root, "real.txt"), filepath.Join(root, "link.txt")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{SymlinkMode: SymlinkAsLink, Parallelism: 2})
	if err != nil {
		t.Fatalf("IndexRoot: %v", err)
	}
	if e, ok := idx["link.txt"]; !ok || e.SymlinkTarget == "" {
		t.Error("expected link.txt with SymlinkTarget")
	}
}

func TestIndexRoot_ParallelSymlinkExclude_toplevel(t *testing.T) {
	root := t.TempDir()
	writeTempFile(t, root, "real.txt", "hello")
	if err := os.Symlink(filepath.Join(root, "real.txt"), filepath.Join(root, "link.txt")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{SymlinkMode: SymlinkExclude, Parallelism: 2})
	if err != nil {
		t.Fatalf("IndexRoot: %v", err)
	}
	if _, ok := idx["link.txt"]; ok {
		t.Error("expected link.txt to be excluded")
	}
}

func TestIndexRoot_ParallelSymlinkFollowFile_toplevel(t *testing.T) {
	root := t.TempDir()
	writeTempFile(t, root, "real.txt", "hello")
	if err := os.Symlink(filepath.Join(root, "real.txt"), filepath.Join(root, "link.txt")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{SymlinkMode: SymlinkFollow, Parallelism: 2})
	if err != nil {
		t.Fatalf("IndexRoot: %v", err)
	}
	if _, ok := idx["link.txt"]; !ok {
		t.Error("expected link.txt with followed symlink")
	}
}

func TestIndexRoot_ParallelSymlinkFollowDir_cycle(t *testing.T) {
	root := t.TempDir()
	writeTempFile(t, root, "a.txt", "hello")

	// Create loop: sub → link that points to sub (self-cycle)
	subDir := filepath.Join(root, "sub")
	if err := os.MkdirAll(subDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(subDir, filepath.Join(subDir, "loop")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{SymlinkMode: SymlinkFollow, Parallelism: 2})
	if err != nil {
		t.Fatalf("IndexRoot with cycle: %v", err)
	}
	if _, ok := idx["a.txt"]; !ok {
		t.Error("expected a.txt")
	}
}

func TestIndexRoot_Parallel_NotDir(t *testing.T) {
	dir := t.TempDir()
	file := writeTempFile(t, dir, "notadir.txt", "x")

	_, err := IndexRoot(context.Background(), file, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{Parallelism: 2})
	if err == nil {
		t.Fatal("expected error for non-directory root")
	}
}

func TestParallelCompare_ContentError_path(t *testing.T) {
	pairs := []ComparePair{
		{Entry{AbsolutePath: "/nonexistent/a"}, Entry{AbsolutePath: "/nonexistent/b"}},
	}
	results := ParallelCompare(context.Background(), pairs, Content, CompareSettings{Parallelism: 1})
	if results[0] {
		t.Error("expected false for non-existent files")
	}
}

func TestIndexRoot_ParallelSymlinkFollowDir(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "targetdir")
	if err := os.MkdirAll(target, 0o755); err != nil {
		t.Fatal(err)
	}
	writeTempFile(t, target, "inside.txt", "hello")
	if err := os.Symlink(target, filepath.Join(root, "linkdir")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{SymlinkMode: SymlinkFollow, Parallelism: 2})
	if err != nil {
		t.Fatalf("IndexRoot: %v", err)
	}
	if _, ok := idx["linkdir/inside.txt"]; !ok {
		t.Errorf("expected linkdir/inside.txt from followed dir symlink, got keys %v", indexKeys(idx))
	}
}

func TestParallelCompare_defaultParallelism(t *testing.T) {
	pairs := []ComparePair{
		{Entry{Size: 1}, Entry{Size: 1}},
	}
	results := ParallelCompare(context.Background(), pairs, SizeOnly, CompareSettings{})
	if len(results) != 1 || !results[0] {
		t.Error("expected equal with default parallelism")
	}
}

func TestParallelCompare_ContentAExistsBDoesNot(t *testing.T) {
	dir := t.TempDir()
	aPath := writeTempFile(t, dir, "a.txt", "hello")
	bPath := filepath.Join(dir, "missing.txt")

	pairs := []ComparePair{
		{Entry{AbsolutePath: aPath}, Entry{AbsolutePath: bPath}},
	}
	results := ParallelCompare(context.Background(), pairs, Content, CompareSettings{Parallelism: 1})
	if results[0] {
		t.Error("expected false when file B does not exist")
	}
}

func TestIndexRoot_ParallelMissingRoot(t *testing.T) {
	root := filepath.Join(t.TempDir(), "missing")

	_, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{Parallelism: 2})
	if err == nil {
		t.Fatal("expected error for missing root")
	}
}

func TestIndexRoot_ParallelAppliesTopLevelFilters(t *testing.T) {
	root := t.TempDir()
	writeTempFile(t, root, ".hidden.txt", "hidden")
	writeTempFile(t, root, "keep.txt", "keep")
	writeTempFile(t, root, "skip.txt", "skip")
	matcher := filter.NewMatcher(filter.FilterRules{
		Include: []string{"**"},
		Exclude: []string{"skip.txt"},
	})

	idx, err := IndexRoot(context.Background(), root, matcher, IndexOptions{Parallelism: 2})
	if err != nil {
		t.Fatalf("IndexRoot: %v", err)
	}
	if _, ok := idx["keep.txt"]; !ok {
		t.Error("expected keep.txt")
	}
	if _, ok := idx[".hidden.txt"]; ok {
		t.Error("expected hidden file to be excluded")
	}
	if _, ok := idx["skip.txt"]; ok {
		t.Error("expected matcher-excluded file to be excluded")
	}
}

func TestIndexRoot_ParallelFollowsSharedDirectoryOnce(t *testing.T) {
	root := t.TempDir()
	target := t.TempDir()
	writeTempFile(t, target, "inside.txt", "content")
	if err := os.Symlink(target, filepath.Join(root, "a-link")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}
	if err := os.Symlink(target, filepath.Join(root, "b-link")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}

	idx, err := IndexRoot(context.Background(), root, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{SymlinkMode: SymlinkFollow, Parallelism: 2})
	if err != nil {
		t.Fatalf("IndexRoot: %v", err)
	}
	if _, ok := idx["a-link/inside.txt"]; !ok {
		t.Error("expected first link target to be indexed")
	}
	if _, ok := idx["b-link/inside.txt"]; ok {
		t.Error("expected duplicate link target to be skipped")
	}
}

func TestIndexRoot_ParallelCancelsFollowedDirectory(t *testing.T) {
	root := t.TempDir()
	target := t.TempDir()
	writeTempFile(t, target, "inside.txt", "content")
	if err := os.Symlink(target, filepath.Join(root, "link")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := IndexRoot(ctx, root, filter.NewMatcher(filter.DefaultRules()),
		IndexOptions{SymlinkMode: SymlinkFollow, Parallelism: 2})
	if err == nil {
		t.Fatal("expected context error")
	}
}

func TestPathSetTryAdd(t *testing.T) {
	set := &pathSet{seen: make(map[string]bool)}
	if !set.tryAdd(filepath.Join(t.TempDir(), "missing")) {
		t.Error("unresolvable path should not be treated as duplicate")
	}

	path := t.TempDir()
	if !set.tryAdd(path) {
		t.Error("first resolved path should be added")
	}
	if set.tryAdd(path) {
		t.Error("second resolved path should be rejected")
	}
}
