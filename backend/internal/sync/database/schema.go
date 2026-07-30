package database

const schemaV1 = `
CREATE TABLE IF NOT EXISTS snapshot (
    relative_path TEXT PRIMARY KEY,
    mod_time_unix INTEGER NOT NULL,
    size          INTEGER NOT NULL,
    file_id       TEXT NOT NULL,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at    TEXT,
    completed_at  TEXT,
    direction     TEXT,
    files_copied  INTEGER DEFAULT 0,
    files_deleted INTEGER DEFAULT 0,
    files_skipped INTEGER DEFAULT 0,
    errors        TEXT
);

CREATE TABLE IF NOT EXISTS progress (
    job_id        TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    action        TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'done',
    mtime         INTEGER NOT NULL DEFAULT 0,
    size          INTEGER NOT NULL DEFAULT 0,
    updated_at    TEXT NOT NULL,
    PRIMARY KEY (job_id, relative_path)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_file_id ON snapshot(file_id);
`

func (db *DB) migrate() error {
	_, err := db.conn.Exec(schemaV1)
	return err
}
