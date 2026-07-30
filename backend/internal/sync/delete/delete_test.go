package delete

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestPermanentDelete(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "delme.txt")
	_ = os.WriteFile(path, []byte("x"), 0o644)

	if err := Delete(context.Background(), path, Permanent, "", ""); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Error("file should be gone after permanent delete")
	}
}

func TestVersioning_RenamesWithTimestamp(t *testing.T) {
	dir := t.TempDir()
	verDir := filepath.Join(dir, "versions")
	path := filepath.Join(dir, "data.txt")
	_ = os.WriteFile(path, []byte("hello"), 0o644)

	if err := Delete(context.Background(), path, Versioning, verDir, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Error("original should be gone after versioning")
	}
	ents, _ := os.ReadDir(verDir)
	if len(ents) != 1 {
		t.Fatalf("expected 1 versioned file, got %d", len(ents))
	}
}

func TestVersioning_RequiresDestDir(t *testing.T) {
	err := Delete(context.Background(), "/tmp/x", Versioning, "", "")
	if err == nil {
		t.Fatal("expected error for empty destDir")
	}
}

func TestVersionReplace_Overwrites(t *testing.T) {
	dir := t.TempDir()
	verDir := filepath.Join(dir, "versions")
	path := filepath.Join(dir, "data.txt")
	_ = os.WriteFile(path, []byte("v1"), 0o644)

	if err := Delete(context.Background(), path, VersionReplace, verDir, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Error("original gone")
	}
	if _, err := os.Stat(filepath.Join(verDir, "data.txt")); err != nil {
		t.Error("versioned file should exist")
	}

	// Second version should replace
	_ = os.WriteFile(path, []byte("v2"), 0o644)
	_ = Delete(context.Background(), path, VersionReplace, verDir, "")
	ents, _ := os.ReadDir(verDir)
	if len(ents) != 1 {
		t.Errorf("replace should keep 1 file, got %d", len(ents))
	}
}

func TestDelete_CtxCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	dir := t.TempDir()
	path := filepath.Join(dir, "x.txt")
	_ = os.WriteFile(path, []byte("x"), 0o644)

	err := Delete(ctx, path, Trash, "", "")
	if err == nil {
		t.Error("expected context error")
	}
}
