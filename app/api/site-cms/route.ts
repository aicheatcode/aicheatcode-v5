import {env} from 'cloudflare:workers';
import {authorizeOwner} from '../../../lib/access-auth.mjs';
import {validatePage} from '../../../lib/site-cms.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const slugs=new Set(['home','belajar','projek','tentang']);
const reject=(status:number,error:string)=>Response.json({error},{status,headers});
async function gate(request:Request){return await authorizeOwner(request,env);}
export async function GET(request:Request){
 if(!await gate(request))return reject(403,'Akses pemilik diperlukan. Sahkan Cloudflare Access.');
 const slug=new URL(request.url).searchParams.get('slug')||'home';
 if(!slugs.has(slug))return reject(400,'Halaman tidak sah.');
 const db=env.DB;if(!db)return reject(503,'Sambungan D1 belum tersedia.');
 try{
  const row=await db.prepare('SELECT draft_json,published_json,revision FROM site_content WHERE slug=?').bind(slug).first<any>();
  const page=row?JSON.parse(row.draft_json):{slug,title:'',description:'',imageUrl:null,sections:[],published:false};
  return Response.json({page,revision:row?.revision||0,published:!!row?.published_json},{headers});
 }catch{return reject(503,'Tidak dapat membaca kandungan D1. Pastikan migrasi CMS sudah dijalankan.');}
}
export async function PUT(request:Request){
 const identity=await gate(request);
 if(!identity)return reject(403,'Akses pemilik diperlukan.');
 if(request.headers.get('origin')!==new URL(request.url).origin)return reject(403,'Asal permintaan tidak sah.');
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reject(415,'JSON diperlukan.');
 const db=env.DB;if(!db)return reject(503,'Sambungan D1 belum tersedia.');
 try{
  const raw=await request.text();
  if(raw.length>300000)return reject(413,'Data melebihi had saiz.');
  const input=JSON.parse(raw),action=input.action;
  if(!['save','publish','unpublish'].includes(action))return reject(400,'Tindakan tidak sah.');
  if(!Number.isSafeInteger(input.revision)||input.revision<0)return reject(400,'Semakan versi tidak sah.');
  const page=validatePage(input.page),slug=page.slug,body=JSON.stringify(page);
  const snapshot=action==='publish'?body:null;
  let statement;
  if(input.revision===0){
   statement= db.prepare('INSERT OR IGNORE INTO site_content (slug,draft_json,published_json,revision) VALUES (?,?,?,1)')
      .bind(slug,body,snapshot);
  }else if(action==='save'){
   statement=db.prepare("UPDATE site_content SET draft_json=?, revision=revision+1, updated_at=datetime('now') WHERE slug=? AND revision=?")
      .bind(body,slug,input.revision);
  }else if(action==='publish'){
   statement=db.prepare("UPDATE site_content SET draft_json=?,published_json=?,revision=revision+1,updated_at=datetime('now') WHERE slug=? AND revision=?")
      .bind(body,body,slug,input.revision);
  }else{
   statement=db.prepare("UPDATE site_content SET draft_json=?,published_json=NULL,revision=revision+1,updated_at=datetime('now') WHERE slug=? AND revision=?")
      .bind(body,slug,input.revision);
  }
  const result=await statement.run();
  if(result.meta.changes!==1)return reject(409,'Kandungan telah diubah pada tab lain. Muat semula sebelum menyimpan.');
  const revision=input.revision+1;
  // Only successful mutations are logged. Failed logging must not hide the successful save.
  try{await db.prepare('INSERT INTO site_content_audit (slug,revision,action) VALUES (?,?,?)')
    .bind(slug,revision,input.revision===0?'create':action==='save'?'update':action).run();}catch{console.error('CMS audit logging failed');}
  return Response.json({revision,published:action==='publish'?true:action==='unpublish'?false:null},{headers});
 }catch(e){
  if(e instanceof SyntaxError)return reject(400,'JSON tidak sah.');
  if(e instanceof Error&&(/tidak sah|diperlukan|mesti|terlalu|had |Maksimum|ID seksyen|teks seksyen|URL gambar|Halaman/.test(e.message)))return reject(400,e.message);
  return reject(503,'Simpanan gagal. Semak migrasi D1 dan log Worker.');
 }
}
