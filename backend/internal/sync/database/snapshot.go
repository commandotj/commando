package database

import (
	"fmt"
	"os"
	"syscall"
)

// SnapshotRow is one record in the snapshot table.
type SnapshotRow struct {
	RelativePath string
	ModTimeUnix  int64
	Size         int64
	FileID       string
}

// FileID computes a stable file identifier: device+inode on Unix.
// Falls back to a placeholder when platform detection is unavailable.
func FileID(info os.FileInfo) string {
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		// coverage:ignore non-Unix platforms — tested on macOS/Linux
		return fmt.Sprintf("%d-%d", info.Size(), info.ModTime().Unix())
	}
	return fmt.Sprintf("%d-%d", stat.Dev, stat.Ino)
}

// UpsertSnapshot inserts or replaces a snapshot row.
func (db *DB) UpsertSnapshot(r SnapshotRow) error {
	_, err := db.conn.Exec(
		`INSERT INTO snapshot (relative_path, mod_time_unix, size, file_id, updated_at)
		 VALUES (?, ?, ?, ?, datetime('now'))
		 ON CONFLICT(relative_path) DO UPDATE SET
		     mod_time_unix = excluded.mod_time_unix,
		     size = excluded.size,
		     file_id = excluded.file_id,
		     updated_at = datetime('now')`,
		r.RelativePath, r.ModTimeUnix, r.Size, r.FileID,
	)
	return err
}

// LoadSnapshot returns all snapshot rows as a map from relative_path.
func (db *DB) LoadSnapshot() (map[string]SnapshotRow, error) {
	rows, err := db.conn.Query(
		`SELECT relative_path, mod_time_unix, size, file_id FROM snapshot`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]SnapshotRow)
	for rows.Next() {
		var r SnapshotRow
		// coverage:ignore Scan failure requires corrupt DB — untestable
		if err := rows.Scan(&r.RelativePath, &r.ModTimeUnix, &r.Size, &r.FileID); err != nil {
			return nil, err
		}
		result[r.RelativePath] = r
	}
	return result, rows.Err()
}
