import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(_r:Request,ctx:{params:Promise<{id:string}>}){
 const {id}=await ctx.params;
 if(!/^[a-f0-9]{64}$/.test(id))return new Response('Not Found',{status:404});
 if(!env.DB)return new Response('Storage unavailable',{status:503});
 try{
  const row=await env.DB.prepare('SELECT mime,bytes FROM cms_media WHERE id=?').bind(id).first<any>();
  if(!row)return new Response('Not Found',{status:404});
  return new Response(new Uint8Array(row.bytes),{headers:{'Content-Type':row.mime,'Content-Security-Policy':"default-src 'none'; sandbox",'X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=604800,immutable'}});
 }catch(e){console.error('CMS media read',e);return new Response('Media unavailable',{status:503});}
}
