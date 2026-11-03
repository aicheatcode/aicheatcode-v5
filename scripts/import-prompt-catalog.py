"""Losslessly import the supplied CSV; validate every reconstructed prompt."""
import csv
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
base = json.loads((root / 'public/data.json').read_text())
legacy = {hashlib.sha256(p['text'].encode()).hexdigest(): p['id'] for p in base['prompts']}
lines, line_ids, groups, contexts, modes, aliases = [], {}, [], [], [], {}
context_lines, mode_lines = {}, {}
categories, types, hashes = Counter(), Counter(), set()
context_token, mode_token = '[[CATALOG_CONTEXT_LINE]]', '[[CATALOG_MODE_LINE]]'

def intern(line):
    if line not in line_ids:
        line_ids[line] = len(lines)
        lines.append(line)
    return line_ids[line]

with source.open(encoding='utf-8-sig', newline='') as handle:
    for index, row in enumerate(csv.DictReader(handle)):
        text = row['Prompt penuh']
        assert text.strip(), f'Empty prompt at {index + 1}'
        digest = hashlib.sha256(text.encode()).hexdigest()
        assert digest not in hashes, f'Duplicate prompt at {index + 1}'
        hashes.add(digest)
        if digest in legacy:
            aliases[str(index + 1)] = legacy[digest]
        context = next(x for x in text.split('\n') if x.startswith('CONTEXT: '))
        mode = next(x for x in text.split('\n') if x.startswith('WORK MODE: '))
        for name, line, names, mapping in [(row['Konteks'], context, contexts, context_lines), (row['Mod'], mode, modes, mode_lines)]:
            if name not in mapping:
                names.append(name)
                mapping[name] = line
            assert mapping[name] == line
        if index % 200 == 0:
            assert context_token not in text and mode_token not in text
            template = text.replace(context, context_token, 1).replace(mode, mode_token, 1)
            groups.append({'start': index + 1, 'count': 200, 'category': row['Kategori'], 'type': row['Subkategori'], 'title': row['Tujuan / tugas'], 'template': [intern(x) for x in template.split('\n')]})
        group = groups[-1]
        assert (group['category'], group['type'], group['title']) == (row['Kategori'], row['Subkategori'], row['Tujuan / tugas'])
        assert contexts.index(row['Konteks']) == (index % 200) // 10
        assert modes.index(row['Mod']) == index % 10
        reconstructed = '\n'.join(lines[x] for x in group['template']).replace(context_token, context).replace(mode_token, mode)
        assert reconstructed == text, f'Lossless reconstruction failed at {index + 1}'
        categories[row['Kategori']] += 1
        types[row['Subkategori']] += 1

assert len(hashes) == 100000 and len(contexts) == 20 and len(modes) == 10
payload = {'version': 1, 'filename': source.name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'importedDate': '2026-11-02', 'total': len(hashes), 'categories': dict(categories), 'types': dict(types), 'contexts': contexts, 'modes': modes, 'contextLines': [context_lines[x] for x in contexts], 'modeLines': [mode_lines[x] for x in modes], 'lines': lines, 'groups': groups, 'aliases': aliases}
encoded = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()
(root / 'public/prompt-catalog.json').write_bytes(encoded)
report = {'status': 'PASS', 'source': source.name, 'sourceSha256': payload['sourceSha256'], 'sourceRows': len(hashes), 'uniqueTexts': len(hashes), 'emptyTexts': 0, 'verbatimReconstructionsVerified': len(hashes), 'existingDuplicatesRetainedByLegacyId': len(aliases), 'newPrompts': len(hashes) - len(aliases), 'existingPrompts': len(base['prompts']), 'combinedUniquePromptsBeforeOwnerEdits': len(base['prompts']) + len(hashes) - len(aliases), 'csvCategories': len(categories), 'csvSubcategories': len(types), 'catalogBytes': len(encoded), 'modelEffectiveness': 'NOT TESTED', 'officialDeveloperAttribution': 'NOT VERIFIED — uploaded CSV contains no official source URLs'}
(root / 'qa').mkdir(exist_ok=True)
(root / 'qa/catalog-import.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
print(json.dumps(report, ensure_ascii=False))
