CREATE TABLE IF NOT EXISTS prompt_records (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, prompt_text TEXT NOT NULL, source_url TEXT, test_status TEXT, origin TEXT NOT NULL, sha256 TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_prompt_category ON prompt_records(category);
CREATE TABLE IF NOT EXISTS catalog_manifest (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS editor_state (id TEXT PRIMARY KEY, body TEXT NOT NULL, revision INTEGER NOT NULL);
