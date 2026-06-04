CREATE TABLE IF NOT EXISTS votes (
  voter_group TEXT PRIMARY KEY CHECK (voter_group IN ('1', '2', '3', '4', '5')),
  scores_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO meta (key, value) VALUES ('voting_epoch', '0');
