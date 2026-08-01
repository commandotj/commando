package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveCLIPath_FromRepoBin(t *testing.T) {
	root, err := filepath.Abs(filepath.Join("..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	bin := filepath.Join(root, "bin", "commando")
	if _, err := os.Stat(bin); err != nil {
		t.Skipf("bin/commando missing (run make cli): %v", err)
	}
	t.Chdir(filepath.Join(root, "apps", "desktop"))
	path, err := resolveCLIPath()
	if err != nil {
		t.Fatal(err)
	}
	if path == "" {
		t.Fatal("expected non-empty path")
	}
}
