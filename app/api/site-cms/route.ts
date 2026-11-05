import {env} from 'cloudflare:workers';
import {validatePage} from '../../../lib/cms-core.mjs';
import {cmsOwnerAuthorized} from '../../../lib/cms-auth.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const fail=(error:string,status:number)=>Response.json({error},{status,headers});
async function allowed(r:Request){return cmsOwnerAuthorized(r,env);}
export async function GET(r:Request){
 if(!(await allowed(r)))return fail('Log masuk melalui Cloudflare Access sebagai pemilik.',403);
 if(!env.DB)return fail('Sambungan D1 tiada.',503);
 try{
  const rows=await env.DB.prepare('SELECT path,draft_json,published_json,revision,updated_at FROM cms_pages ORDER BY path LIMIT 200').all();
  return Response.json({pages:(rows.results||[]).map((row:any)=>({path:row.path,document:JSON.parse(row.draft_json),published:!!row.published_json,revision:row.revision,updatedAt:row.updated_at}))},{headers});
 }catch(e){console.error('CMS read',e);return fail('Database CMS belum tersedia.',503);}
}
export async function PUT(r:Request){
 if(!(await allowed(r)))return fail('Akses pemilik diperlukan.',403);
 if(r.headers.get('origin')!==new URL(r.url).origin)return fail('Asal permintaan tidak sah.',403);
 if(!r.headers.get('content-type')?.toLowerCase().includes('application/json'))return fail('JSON diperlukan.',415);
 if(!env.DB)return fail('Sambungan D1 tiada.',503);
 try{
  const raw=await r.text();
  if(raw.length>250000)return fail('Data melebihi had.',413);
  const {document,revision,action}=JSON.parse(raw);
  if(!['save','publish','unpublish'].includes(action)||!Number.isInteger(revision)||revision<0)return fail('Tindakan atau versi tidak sah.',400);
  const doc=validatePage(document), body=JSON.stringify(doc);
  const identity=String((env as unknown as Record<string,string>).CMS_OWNER_EMAIL||'cms-owner').slice(0,200);
  let result:any;
  if(revision===0){
   result=await env.DB.prepare('INSERT OR IGNORE INTO cms_pages(path,draft_json,published_json,revision,updated_at,updated_by) VALUES (?,?,?,?,CURRENT_TIMESTAMP,?)').bind(doc.path,body,action==='publish'?body:null,1,identity).run();
  }else{
   result=await env.DB.prepare("UPDATE cms_pages SET draft_json=?,published_json=CASE WHEN ?='publish' THEN ? WHEN ?='unpublish' THEN NULL ELSE published_json END,revision=revision+1,updated_at=CURRENT_TIMESTAMP,updated_by=? WHERE path=? AND revision=?").bind(body,action,body,action,identity,doc.path,revision).run();
  }
  if(!result.meta?.changes)return fail('Konflik versi: muat semula dahulu sebelum menyimpan.',409);
  return Response.json({ok:true,path:doc.path,revision:revision+1,published:action==='publish'?true:action==='unpublish'?false:undefined},{headers});
 }catch(e){console.error('CMS write failed',e);return fail(e instanceof Error?e.message:'Simpanan gagal.',400);}
}