package fsutil

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWalkRoot_IndexesFilesByRelativePath(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "a.txt"), "hello")

	entries, err := WalkRoot(root)
	if err != nil {
		t.Fatalf("WalkRoot returned error: %v", err)
	}

	entry, ok := entries["a.txt"]
	if !ok {
		t.Fatalf("expected entry for a.txt, got keys %v", keys(entries))
	}
	if entry.IsDir {
		t.Errorf("expected a.txt to be a file, got IsDir=true")
	}
	if entry.Size != 5 {
		t.Errorf("expected size 5, got %d", entry.Size)
	}
}

func TestWalk_SymlinkExclude_OmitsSymlink(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "real.txt"), "hello")
	writeSymlink(t, filepath.Join(root, "real.txt"), filepath.Join(root, "link.txt"))

	entries, err := Walk(root, WalkOptions{SymlinkMode: SymlinkExclude})
	if err != nil {
		t.Fatalf("Walk returned error: %v", err)
	}

	if _, ok := entries["link.txt"]; ok {
		t.Errorf("expected link.txt to be excluded, got entry %+v", entries["link.txt"])
	}
	if _, ok := entries["real.txt"]; !ok {
		t.Errorf("expected real.txt to be indexed, got keys %v", keys(entries))
	}
}

func TestWalk_SymlinkAsLink_KeepsEntryWithTarget(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "real.txt"), "hello")
	writeSymlink(t, filepath.Join(root, "real.txt"), filepath.Join(root, "link.txt"))

	entries, err := Walk(root, WalkOptions{SymlinkMode: SymlinkAsLink})
	if err != nil {
		t.Fatalf("Walk returned error: %v", err)
	}

	entry, ok := entries["link.txt"]
	if !ok {
		t.Fatalf("expected link.txt to be indexed, got keys %v", keys(entries))
	}
	if entry.SymlinkTarget != filepath.Join(root, "real.txt") {
		t.Errorf("expected SymlinkTarget %q, got %q", filepath.Join(root, "real.txt"), entry.SymlinkTarget)
	}
}

func TestWalk_SymlinkFollow_IndexesTargetContents(t *testing.T) {
	root := t.TempDir()
	sub := filepath.Join(root, "sub")
	writeFile(t, filepath.Join(sub, "file.txt"), "hello")
	writeSymlink(t, sub, filepath.Join(root, "link"))

	entries, err := Walk(root, WalkOptions{SymlinkMode: SymlinkFollow})
	if err != nil {
		t.Fatalf("Walk returned error: %v", err)
	}

	if _, ok := entries["link/file.txt"]; !ok {
		t.Fatalf("expected link/file.txt to be indexed via followed symlink, got keys %v", keys(entries))
	}
}

func TestWalk_SymlinkFollow_FileSymlinkUsesTargetMetadata(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "real.txt"), "hello")
	writeSymlink(t, filepath.Join(root, "real.txt"), filepath.Join(root, "link.txt"))

	entries, err := Walk(root, WalkOptions{SymlinkMode: SymlinkFollow})
	if err != nil {
		t.Fatalf("Walk returned error: %v", err)
	}

	entry, ok := entries["link.txt"]
	if !ok {
		t.Fatalf("expected link.txt to be indexed, got keys %v", keys(entries))
	}
	if entry.IsDir {
		t.Errorf("expected link.txt to resolve to a file, got IsDir=true")
	}
	if entry.Size != 5 {
		t.Errorf("expected size 5 (from target real.txt), got %d", entry.Size)
	}
}

func TestWalkRoot_SkipsHiddenFiles(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".hidden"), "secret")
	writeFile(t, filepath.Join(root, "visible.txt"), "hello")

	entries, err := WalkRoot(root)
	if err != nil {
		t.Fatalf("WalkRoot returned error: %v", err)
	}

	if _, ok := entries[".hidden"]; ok {
		t.Errorf("expected .hidden to be skipped, got entry %+v", entries[".hidden"])
	}
	if _, ok := entries["visible.txt"]; !ok {
		t.Errorf("expected visible.txt to be indexed, got keys %v", keys(entries))
	}
}

func TestWalkRoot_SkipsGitDirectory(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, ".git", "config"), "gitconfig")
	writeFile(t, filepath.Join(root, "a.txt"), "hello")

	entries, err := WalkRoot(root)
	if err != nil {
		t.Fatalf("WalkRoot returned error: %v", err)
	}

	if _, ok := entries[".git/config"]; ok {
		t.Errorf("expected .git/config to be skipped, got it indexed")
	}
	if _, ok := entries["a.txt"]; !ok {
		t.Errorf("expected a.txt to be indexed, got keys %v", keys(entries))
	}
}

func TestWalkRoot_SkipsNodeModulesDirectory(t *testing.T) {
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "node_modules", "pkg", "index.js"), "module.exports={}")
	writeFile(t, filepath.Join(root, "a.txt"), "hello")

	entries, err := WalkRoot(root)
	if err != nil {
		t.Fatalf("WalkRoot returned error: %v", err)
	}

	if _, ok := entries["node_modules/pkg/index.js"]; ok {
		t.Errorf("expected node_modules contents to be skipped, got it indexed")
	}
	if _, ok := entries["a.txt"]; !ok {
		t.Errorf("expected a.txt to be indexed, got keys %v", keys(entries))
	}
}

func TestWalkRoot_NonExistentPath_ReturnsError(t *testing.T) {
	_, err := WalkRoot(filepath.Join(t.TempDir(), "does-not-exist"))
	if err == nil {
		t.Fatal("expected error for non-existent root, got nil")
	}
}

func TestWalkRoot_PathIsFile_ReturnsError(t *testing.T) {
	root := t.TempDir()
	filePath := filepath.Join(root, "notadir.txt")
	writeFile(t, filePath, "hello")

	_, err := WalkRoot(filePath)
	if err == nil {
		t.Fatal("expected error when root is a file, not a directory")
	}
}

func TestWalk_NonExistentPath_ReturnsError(t *testing.T) {
	_, err := Walk(filepath.Join(t.TempDir(), "does-not-exist"), WalkOptions{SymlinkMode: SymlinkExclude})
	if err == nil {
		t.Fatal("expected error for non-existent root, got nil")
	}
}

func TestWalk_SymlinkFollow_DanglingSymlink_ReturnsError(t *testing.T) {
	root := t.TempDir()
	writeSymlink(t, filepath.Join(root, "does-not-exist"), filepath.Join(root, "dangling"))

	_, err := Walk(root, WalkOptions{SymlinkMode: SymlinkFollow})
	if err == nil {
		t.Fatal("expected error for dangling symlink under SymlinkFollow, got nil")
	}
}

func TestWalkRoot_UnreadableSubdirectory_ReturnsError(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("running as root ignores directory permissions")
	}

	root := t.TempDir()
	blocked := filepath.Join(root, "blocked")
	writeFile(t, filepath.Join(blocked, "secret.txt"), "hello")
	if err := os.Chmod(blocked, 0o000); err != nil {
		t.Fatalf("Chmod failed: %v", err)
	}
	t.Cleanup(func() { os.Chmod(blocked, 0o755) })

	_, err := WalkRoot(root)
	if err == nil {
		t.Fatal("expected error walking into unreadable subdirectory, got nil")
	}
}

func keys(m map[string]Entry) []string {
	ks := make([]string, 0, len(m))
	for k := range m {
		ks = append(ks, k)
	}
	return ks
}
