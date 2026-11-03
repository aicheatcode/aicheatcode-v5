import sqlite3, pathlib, sys
p=pathlib.Path('database/d1')
if not p.exists():
    print('FAIL: database/d1 missing');sys.exit(1)
files=[p/'000_schema.sql']+sorted(p.glob('0[0-1][0-9]_seed.sql'))+[p/'099_manifest.sql']
missing=[str(x) for x in files if not x.exists()]
if missing:
    print('FAIL missing:',missing);sys.exit(1)
conn=sqlite3.connect(':memory:')
for f in files: conn.executescript(f.read_text())
assert conn.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
count=conn.execute('SELECT COUNT(*) FROM prompt_records').fetchone()[0]
assert count==1071, f'Expected 1071, got {count}'
assert conn.execute('SELECT COUNT(DISTINCT id) FROM prompt_records').fetchone()[0]==count
print('PASS SQLite import, integrity and unique IDs:',count)
