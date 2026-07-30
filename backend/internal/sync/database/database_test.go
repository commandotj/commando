package database

import (
	"os"
	"path/filepath"
	"testing"
)

func TestOpenAndMigrate(t *testing.T) {
	dir := t.TempDir()
	db, err := Open(filepath.Join(dir, "sync.commando_db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
}

func TestUpsertAndLoadSnapshot(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))

	row := SnapshotRow{RelativePath: "a.txt", ModTimeUnix: 100, Size: 42, FileID: "dev-ino"}
	if err := db.UpsertSnapshot(row); err != nil {
		t.Fatal(err)
	}

	snap, err := db.LoadSnapshot()
	if err != nil {
		t.Fatal(err)
	}
	if len(snap) != 1 || snap["a.txt"].ModTimeUnix != 100 {
		t.Errorf("bad snapshot: %v", snap)
	}
}

func TestUpsertSnapshot_Update(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))

	_ = db.UpsertSnapshot(SnapshotRow{RelativePath: "a.txt", ModTimeUnix: 100, Size: 10, FileID: "A"})
	_ = db.UpsertSnapshot(SnapshotRow{RelativePath: "a.txt", ModTimeUnix: 200, Size: 20, FileID: "A"})

	snap, _ := db.LoadSnapshot()
	if snap["a.txt"].ModTimeUnix != 200 {
		t.Error("expected updated mtime")
	}
}

func TestWriteSnapshot(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))

	rows := []SnapshotRow{
		{RelativePath: "a.txt", ModTimeUnix: 1, Size: 10, FileID: "A"},
		{RelativePath: "b.txt", ModTimeUnix: 2, Size: 20, FileID: "B"},
	}
	if err := db.WriteSnapshot(rows); err != nil {
		t.Fatal(err)
	}
	snap, _ := db.LoadSnapshot()
	if len(snap) != 2 {
		t.Errorf("expected 2 rows, got %d", len(snap))
	}
}

func TestClearSnapshot(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))

	_ = db.UpsertSnapshot(SnapshotRow{RelativePath: "a.txt", ModTimeUnix: 1, Size: 10, FileID: "A"})
	_ = db.ClearSnapshot()
	snap, _ := db.LoadSnapshot()
	if len(snap) != 0 {
		t.Error("expected empty after clear")
	}
}

func TestDetectMoves_NoPrevious(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))

	moves := db.DetectMoves(map[string]SnapshotRow{"a.txt": {FileID: "A"}})
	if len(moves) != 0 {
		t.Error("expected no moves with empty history")
	}
}

func TestDetectMoves_FindsMovedFile(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))

	_ = db.WriteSnapshot([]SnapshotRow{
		{RelativePath: "old/a.txt", ModTimeUnix: 1, Size: 10, FileID: "A"},
	})

	current := map[string]SnapshotRow{
		"new/a.txt": {RelativePath: "new/a.txt", ModTimeUnix: 1, Size: 10, FileID: "A"},
	}

	moves := db.DetectMoves(current)
	if len(moves) != 1 {
		t.Fatalf("expected 1 move, got %d", len(moves))
	}
	if moves[0].OldPath != "old/a.txt" || moves[0].NewPath != "new/a.txt" {
		t.Errorf("bad move: %+v", moves[0])
	}
}

func TestDetectMoves_UnchangedFile(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))

	_ = db.WriteSnapshot([]SnapshotRow{
		{RelativePath: "a.txt", ModTimeUnix: 1, Size: 10, FileID: "A"},
	})
	current := map[string]SnapshotRow{
		"a.txt": {RelativePath: "a.txt", ModTimeUnix: 1, Size: 10, FileID: "A"},
	}
	if len(db.DetectMoves(current)) != 0 {
		t.Error("unchanged file should not be a move")
	}
}

func TestDetectMoves_DeletedFile(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))

	_ = db.WriteSnapshot([]SnapshotRow{
		{RelativePath: "gone.txt", ModTimeUnix: 1, Size: 10, FileID: "A"},
	})
	if len(db.DetectMoves(map[string]SnapshotRow{})) != 0 {
		t.Error("deleted file without new path should not be a move")
	}
}

func TestFileID(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.txt")
	if err := os.WriteFile(path, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	id := FileID(info)
	if id == "" {
		t.Error("FileID should not be empty")
	}
	// Verify idempotent
	if FileID(info) != id {
		t.Error("FileID should be stable")
	}
}

func TestFileID_DifferentFiles(t *testing.T) {
	dir := t.TempDir()
	a := filepath.Join(dir, "a.txt")
	b := filepath.Join(dir, "b.txt")
	_ = os.WriteFile(a, []byte("a"), 0o644)
	_ = os.WriteFile(b, []byte("b"), 0o644)
	infoA, _ := os.Stat(a)
	infoB, _ := os.Stat(b)
	if FileID(infoA) == FileID(infoB) {
		t.Error("different files should have different FileIDs")
	}
}

func TestDetectMoves_EmptyFileID_Skipped(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))

	_ = db.WriteSnapshot([]SnapshotRow{
		{RelativePath: "old/a.txt", ModTimeUnix: 1, Size: 10, FileID: ""},
	})
	current := map[string]SnapshotRow{
		"new/a.txt": {RelativePath: "new/a.txt", ModTimeUnix: 1, Size: 10, FileID: ""},
	}
	if len(db.DetectMoves(current)) != 0 {
		t.Error("empty FileID should not produce move candidates")
	}
}

func TestOpen_BadPath(t *testing.T) {
	dir := t.TempDir()
	// Create a regular file where a directory is expected in the path
	_ = os.WriteFile(filepath.Join(dir, "notadir"), []byte("x"), 0o644)
	_, err := Open(filepath.Join(dir, "notadir", "sub", "sync.db"))
	if err == nil {
		t.Fatal("expected error opening db under a non-directory path")
	}
}

func TestWriteSnapshot_AfterClose(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))
	db.Close()

	err := db.WriteSnapshot([]SnapshotRow{{RelativePath: "a.txt", ModTimeUnix: 1, Size: 10, FileID: "A"}})
	if err == nil {
		t.Fatal("expected error after close")
	}
}

func TestLoadSnapshot_BadSchema(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "sync.commando_db"))
	defer db.Close()

	db.conn.Exec(`DROP TABLE IF EXISTS snapshot`)
	db.conn.Exec(`CREATE TABLE snapshot (relative_path INTEGER PRIMARY KEY, mod_time_unix INTEGER)`)
	db.conn.Exec(`INSERT INTO snapshot VALUES (1, 2)`)

	_, err := db.LoadSnapshot()
	if err == nil {
		t.Fatal("expected Scan error with wrong column count")
	}
}

func TestOpen_BadDBFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "corrupt.db")
	_ = os.WriteFile(path, []byte("not a valid sqlite database"), 0o644)
	_, err := Open(path)
	if err == nil {
		t.Fatal("expected error opening corrupt file")
	}
}
