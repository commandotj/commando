package database

// MoveCandidate is a file that may have been moved since the last sync.
type MoveCandidate struct {
	OldPath string
	NewPath string
	Size    int64
}

// DetectMoves compares the current index against the last snapshot to find
// files that were moved (same file_id, different relative_path).
func (db *DB) DetectMoves(current map[string]SnapshotRow) []MoveCandidate {
	prev, err := db.LoadSnapshot()
	if err != nil || len(prev) == 0 {
		return nil
	}

	// Build index: file_id → current path
	curByID := make(map[string]string)
	for _, r := range current {
		if r.FileID != "" {
			curByID[r.FileID] = r.RelativePath
		}
	}

	var moves []MoveCandidate
	for _, old := range prev {
		if old.FileID == "" {
			continue
		}
		newPath, ok := curByID[old.FileID]
		if !ok || newPath == old.RelativePath {
			continue
		}
		// file_id unchanged, path changed → moved
		moves = append(moves, MoveCandidate{
			OldPath: old.RelativePath,
			NewPath: newPath,
			Size:    old.Size,
		})
	}
	return moves
}

// ClearSnapshot removes all rows from the snapshot table.
func (db *DB) ClearSnapshot() error {
	_, err := db.conn.Exec(`DELETE FROM snapshot`)
	return err
}

// WriteSnapshot replaces the entire snapshot table with the given rows in a
// single transaction.
func (db *DB) WriteSnapshot(rows []SnapshotRow) error {
	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM snapshot`); err != nil {
		return err
	}
	for _, r := range rows {
		if _, err := tx.Exec(
			`INSERT INTO snapshot (relative_path, mod_time_unix, size, file_id, updated_at)
			 VALUES (?, ?, ?, ?, datetime('now'))`,
			r.RelativePath, r.ModTimeUnix, r.Size, r.FileID,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}
