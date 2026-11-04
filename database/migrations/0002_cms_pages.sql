-- No existing prompts or editor_state rows are modified.
CREATE TABLE IF NOT EXISTS cms_pages (
 path TEXT PRIMARY KEY,
 draft_json TEXT NOT NULL,
 published_json TEXT,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cms_pages_published ON cms_pages(path) WHERE published_json IS NOT NULL;
