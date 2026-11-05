-- Additive CMS migration. Existing catalog and editor data are retained.
CREATE TABLE IF NOT EXISTS site_content (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  sections_json TEXT NOT NULL DEFAULT '[]',
  revision INTEGER NOT NULL DEFAULT 1,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_content_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  revision INTEGER NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  action TEXT NOT NULL CHECK(action IN ('create','update','publish','unpublish'))
);
CREATE INDEX IF NOT EXISTS idx_site_content_published ON site_content(published);
