import csv,json,hashlib,sys
from pathlib import Path
source=Path(sys.argv[1]);index=json.loads(Path('public/prompt-catalog.json').read_text());count=0;bad=[];sha=hashlib.sha256()
with source.open('rb')as f:
 for b in iter(lambda:f.read(1024*1024),b''):sha.update(b)
with source.open(encoding='utf-8-sig',newline='')as f:
 for count,row in enumerate(csv.DictReader(f),1):
  g=index['groups'][(count-1)//200];offset=(count-1)%200;ci=offset//10;mi=offset%10
  text='\n'.join(index['lines'][n]for n in g['template']).replace('[[CATALOG_CONTEXT_LINE]]',index['contextLines'][ci]).replace('[[CATALOG_MODE_LINE]]',index['modeLines'][mi])
  if text!=row['Prompt penuh'] or (g['category'],g['type'],g['title'],index['contexts'][ci],index['modes'][mi])!=(row['Kategori'],row['Subkategori'],row['Tujuan / tugas'],row['Konteks'],row['Mod']):bad.append(count)
r={'status':'PASS'if count==index['total']and not bad and sha.hexdigest()==index['sourceSha256']else'FAIL','source_name':source.name,'records_compared':count,'mismatched_rows':bad[:30],'sha256':sha.hexdigest(),'expected_sha256':index['sourceSha256'],'scope':'All source CSV prompt text and metadata compared with reconstructed catalog; AI effectiveness not tested'}
Path('docs/verification/csv-integrity.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2));sys.exit(r['status']!='PASS')
