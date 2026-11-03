import urllib.request,urllib.error,json,hashlib,re,concurrent.futures
from pathlib import Path
urls=['https://cannybrainy.com'+p for p in ['/','/prompt','/bina','/panduan','/koleksi','/sumber-status','/tentang','/privasi','/robots.txt','/sitemap.xml','/not-a-real-page']]+['https://aicheatcode-prompt-playground-1024.akhmalkadir05.chatgpt.site/','https://belajararabmudah.netlify.app/','https://coursesfreeai.netlify.app/']
def check(u):
 try:
  with urllib.request.urlopen(u,timeout=20) as r:
   b=r.read();s=b.decode('utf8','replace');return {'requested':u,'url':r.url,'status':r.status,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'title':re.findall(r'<title>(.*?)</title>',s),'canonical':re.findall(r'<link[^>]+canonical[^>]+>',s),'headers':{k:v for k,v in r.headers.items() if k.lower() in ['content-type','cache-control','content-security-policy','strict-transport-security','x-content-type-options']}}
 except urllib.error.HTTPError as e:return {'requested':u,'status':e.code}
 except Exception as e:return {'requested':u,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5)as p:r=list(p.map(check,urls))
Path('docs/verification/production-http.json').write_text(json.dumps(r,indent=2));print(json.dumps([{k:v for k,v in x.items() if k in ['requested','status','error','bytes']}for x in r],indent=2))
