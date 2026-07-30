package database

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// DB wraps a SQLite database used to persist sync snapshots and logs.
type DB struct {
	conn *sql.DB
	path string
}

// Open creates or opens the database at dbPath. WAL mode is enabled for
// concurrent reads and resilience. The caller is responsible for closing
// the returned database.
func Open(dbPath string) (*DB, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, err
	}

	conn, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, err
	}

	db := &DB{conn: conn, path: dbPath}
	if err := db.migrate(); err != nil {
		return nil, err
	}
	return db, nil
}

// Close releases the database connection.
func (db *DB) Close() error {
	return db.conn.Close()
}
