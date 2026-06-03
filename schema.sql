CREATE TABLE IF NOT EXISTS votes (
  voter_group TEXT PRIMARY KEY CHECK (voter_group IN ('A', 'B', 'C', 'D', 'E')),
  scores_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
