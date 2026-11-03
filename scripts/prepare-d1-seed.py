"""Create an insert-only D1 bootstrap from the verified source SQL."""
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED_KEY = "aicheatcode_v5_initial_seed"
COLUMNS = "id,title,category,prompt_text,source_url,test_status,origin,sha256"


def prepare_seed(root=ROOT):
    source = sqlite3.connect(":memory:")
    folder = root / "database/d1"
    files = [folder / "000_schema.sql", *sorted(folder.glob("0[0-1][0-9]_seed.sql")), folder / "099_manifest.sql"]
    assert len(files) == 13, "Expected schema, eleven seed files and manifest"
    for file in files:
        source.executescript(file.read_text())
    assert source.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    records = source.execute(f"SELECT {COLUMNS} FROM prompt_records ORDER BY id").fetchall()
    catalog = source.execute("SELECT key,value FROM catalog_manifest ORDER BY key").fetchall()
    assert len(records) == len({row[0] for row in records}) == 1071
    fingerprint = hashlib.sha256(json.dumps([records, catalog], ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()

    def quote(value):
        return source.execute("SELECT quote(?)", (value,)).fetchone()[0]

    statements = [f"INSERT OR IGNORE INTO prompt_records ({COLUMNS}) VALUES ({','.join(map(quote, row))});" for row in records]
    statements += [f"INSERT OR IGNORE INTO catalog_manifest(key,value) VALUES ({quote(key)},{quote(value)});" for key, value in catalog]
    # A failed/interrupted import can safely resume. The marker is written last.
    statements.append(f"INSERT OR IGNORE INTO catalog_manifest(key,value) VALUES ({quote(SEED_KEY)},{quote(fingerprint)});")
    metadata = {"count": len(records), "ids": [r[0] for r in records], "key": SEED_KEY, "sha256": fingerprint}
    return "\n".join(statements) + "\n", metadata


def check_seed(sql, metadata):
    target = sqlite3.connect(":memory:")
    for migration in sorted((ROOT / "database/migrations").glob("*.sql")):
        target.executescript(migration.read_text())
    first = metadata["ids"][0]
    target.execute("INSERT INTO prompt_records VALUES (?,?,?,?,?,?,?,?)", (first, "Owner edit", "Owner", "Keep this text", None, None, "owner", "preserve"))
    target.execute("INSERT INTO editor_state VALUES ('main',?,9)", ('{"draft":"keep"}',))
    target.executescript(sql)
    target.executescript(sql)
    assert target.execute("SELECT COUNT(*) FROM prompt_records").fetchone()[0] == 1071
    assert target.execute("SELECT prompt_text FROM prompt_records WHERE id=?", (first,)).fetchone()[0] == "Keep this text"
    assert target.execute("SELECT body,revision FROM editor_state").fetchone() == ('{"draft":"keep"}', 9)
    assert target.execute("SELECT value FROM catalog_manifest WHERE key=?", (metadata["key"],)).fetchone()[0] == metadata["sha256"]
    assert target.execute("PRAGMA integrity_check").fetchone()[0] == "ok"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / ".cloudflare/production")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    sql, metadata = prepare_seed()
    check_seed(sql, metadata)
    if args.check:
        print("PASS: 1,071 seed records; repeated import preserves existing prompts and editor state")
    else:
        args.output.mkdir(parents=True, exist_ok=True)
        (args.output / "seed.sql").write_text(sql)
        (args.output / "seed-manifest.json").write_text(json.dumps(metadata))
        print(json.dumps({"status": "PASS", "count": metadata["count"], "sha256": metadata["sha256"]}))
