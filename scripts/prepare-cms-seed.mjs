// Idempotent D1 draft migration from existing project and lesson source.
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {lessons,registry} from '../lib/hub.mjs';
import {validatePage} from '../lib/cms-core.mjs';
const tr=x=>Array.isArray(x)?x[0]:x&&typeof x==='object'?x.ms||x.en||'':String(x||'');
const sq=x=>"'"+String(x).replaceAll("'","''")+"'";
const block=(id,type,title,text,more={})=>({id,type,title,text,...more});
const docs=[];
const add=(path,title,description,blocks)=>docs.push(validatePage({path,title,description,blocks}));
add('/','Belajar AI. Cipta lebih.','Belajar AI dan kemahiran digital secara percuma.',[
 block('intro','hero','LEARN AI. CREATE MORE.','Belajar AI, Canva dan kemahiran digital.',{href:'/belajar',label:'Mula belajar'}),
 block('pillars','cards','Empat bidang pembelajaran','Cuba satu kemahiran hari ini.',{items:lessons.map(l=>({title:l.pillar,text:tr(l.goal),href:'/belajar/'+l.slug}))})
]);
add('/belajar','Belajar','Tutorial digital AICHEATCODE.',[
 block('intro','hero','SATU KEMAHIRAN. SATU AKTIVITI.','Pilih satu bidang, cuba dan semak hasil.'),
 block('directory','cards','Tutorial', 'Empat bidang utama.',{items:lessons.map(l=>({title:tr(l.title),text:tr(l.goal),href:'/belajar/'+l.slug}))})
]);
add('/projek','Projek dan bukti','Inventori projek digital.',[
 block('intro','hero','APA YANG DIBINA. APA YANG TERBUKTI.','Projek dan semakan bukti sebenar.'),
 block('directory','cards','Projek pilihan','Buka projek dan semak status.',{items:registry.slice(0,24).map(p=>({title:p.name,text:tr(p.summary),href:'/projek/'+p.slug}))})
]);
add('/tentang','Tentang AICHEATCODE','Platform pendidikan kemahiran digital.',[
 block('intro','hero','ILMU DIGITAL UNTUK SEMUA.','Platform pembelajaran percuma untuk pemula, pelajar dan pendidik.'),
 block('mission','text','Misi','Belajar, cuba dan semak hasil. ARTSCIPES menyokong operasi di belakang AICHEATCODE.')
]);
for(const l of lessons)add('/belajar/'+l.slug,tr(l.title),tr(l.goal),[
 block('intro','hero',tr(l.title),tr(l.goal)),
 block('steps','text','Langkah pembelajaran',l.steps.map((s,i)=>(i+1)+'. '+tr(s)).join('\n')),
 block('practice','text','Aktiviti praktikal',tr(l.activity)+'\nHasil: '+tr(l.outcome)),
 block('back','cta','Teruskan belajar','', {href:'/belajar',label:'Semua tutorial'})
]);
for(const p of registry)add('/projek/'+p.slug,p.name,tr(p.summary),[
 block('intro','hero',p.name,tr(p.summary)),
 block('status','text','Status dan fungsi','Status: '+(p.status||'NOT TESTED')+'\nAkses: '+(p.access||'NOT TESTED')+'\nFungsi: '+(p.functions||[]).join(' · ')),
 block('proof','text','Bukti dan batasan',(p.evidence||[]).map(e=>tr(e.ms||e)).join('\n')||'Bukti lanjut belum disahkan.'),
 block('back','cta','Lihat projek lain','',{href:'/projek',label:'Semua projek'})
]);
const unique=new Set(docs.map(d=>d.path));if(unique.size!==docs.length)throw Error('Duplicate CMS page path');
const i=process.argv.indexOf('--output');if(i<0||!process.argv[i+1])throw Error('--output directory required');
const out=resolve(process.argv[i+1]);mkdirSync(out,{recursive:true});
const sql=docs.map(d=>'INSERT OR IGNORE INTO cms_pages(path,draft_json,published_json,revision,updated_by) VALUES ('+sq(d.path)+','+sq(JSON.stringify(d))+",NULL,1,'system-import');").join('\n')+'\n';
writeFileSync(resolve(out,'cms-drafts-seed.sql'),sql);
writeFileSync(resolve(out,'cms-drafts-manifest.json'),JSON.stringify({count:docs.length,paths:docs.map(d=>d.path),published:0},null,2));
console.log(JSON.stringify({status:'PASS',count:docs.length,published:0}));
