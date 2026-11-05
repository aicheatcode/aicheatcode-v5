import {env} from 'cloudflare:workers';
import {initial,validate} from '../../../lib/editor.mjs';
import {cmsOwnerAuthorized} from '../../../lib/cms-auth.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
// Identity headers must be stripped and reissued by a trusted authentication gateway.
// Never expose this endpoint directly to untrusted clients without that gateway.
async function allowed(r:Request){return cmsOwnerAuthorized(r,env);}
export async function GET(r:Request){if(!(await allowed(r)))return Response.json({error:'Log masuk dengan akaun pemilik untuk menyunting.'},{status:403,headers});const db=env.DB;if(!db)return Response.json({error:"Pangkalan data belum tersedia."},{status:503,headers});const row=await db.prepare("SELECT body,revision FROM editor_state WHERE id='main'").first<any>();return Response.json({state:row?JSON.parse(row.body):initial(),revision:row?.revision||0},{headers});}
export async function PUT(r:Request){
 if(!(await allowed(r)))return Response.json({error:'Akses pemilik diperlukan.'},{status:403,headers});
 if(r.headers.get('origin')!==new URL(r.url).origin)return Response.json({error:'Asal permintaan tidak sah.'},{status:403,headers});
 if(!r.headers.get('content-type')?.includes('application/json'))return Response.json({error:'JSON diperlukan.'},{status:415,headers});
 const db=env.DB;if(!db)return Response.json({error:'Pangkalan data belum tersedia.'},{status:503,headers});
 try{const raw=await r.text();if(raw.length>1000000)return Response.json({error:'Kandungan terlalu besar.'},{status:413,headers});const {state,revision}=JSON.parse(raw);validate(state);if(!Number.isInteger(revision)||revision<0)throw Error('Versi tidak sah.');const body=JSON.stringify(state);
 const result=revision===0?await db.prepare("INSERT OR IGNORE INTO editor_state (id,body,revision) VALUES ('main',?,1)").bind(body).run():await db.prepare("UPDATE editor_state SET body=?,revision=revision+1 WHERE id='main' AND revision=?").bind(body,revision).run();
 if(!result.meta.changes)return Response.json({error:'Ada perubahan dari tab/peranti lain. Eksport kerja anda, kemudian muat semula.'},{status:409,headers});return Response.json({revision:revision+1},{headers});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Simpanan gagal.'},{status:400,headers});}
}
