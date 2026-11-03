import {env} from 'cloudflare:workers';
import base from '../../../public/data.json';
import {initial,merge} from '../../../lib/editor.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 try {
  const db=env.DB;
  if(!db)return Response.json({error:'Database D1 binding DB unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
  const [records,editor]=await Promise.all([
   db.prepare('SELECT id,title,category,prompt_text,source_url,test_status,origin FROM prompt_records ORDER BY id').all(),
   db.prepare("SELECT body FROM editor_state WHERE id='main'").first<{body:string}>()
  ]);
  const originalTypes=new Map(base.prompts.map((p:any)=>[p.id,p.type]));
  const prompts=(records.results??[]).map((r:any)=>({id:r.id,title:r.title,category:r.category,type:originalTypes.get(r.id)??'Prompt',text:r.prompt_text,sourceUrl:r.source_url,testStatus:r.test_status,origin:r.origin}));
  const state=editor?JSON.parse(editor.body):initial();
  return Response.json({...merge({...base,prompts},state),catalogDeleted:state.deleted},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('content database error',e);return Response.json({error:'Database query failed'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
