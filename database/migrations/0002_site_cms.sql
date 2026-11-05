-- CMS entries are additive. Preserve existing prompt_records and editor_state.
-- A separate published snapshot prevents unfinished drafts leaking onto public pages.
CREATE TABLE IF NOT EXISTS site_content (
  slug TEXT PRIMARY KEY,
  draft_json TEXT NOT NULL,
  published_json TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_content_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  revision INTEGER NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  action TEXT NOT NULL CHECK(action IN ('create','update','publish','unpublish'))
);
CREATE INDEX IF NOT EXISTS idx_site_content_updated ON site_content(updated_at);
