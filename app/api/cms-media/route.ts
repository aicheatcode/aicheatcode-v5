import {env} from 'cloudflare:workers';
import {cmsOwnerAuthorized} from '../../../lib/cms-auth.mjs';
import {MAX_MEDIA_BYTES,detectImageMime} from '../../../lib/cms-media.mjs';
export const dynamic='force-dynamic';
export async function POST(r:Request){
 if(!(await cmsOwnerAuthorized(r,env)))return Response.json({error:'Akses pemilik diperlukan.'},{status:403});
 if(r.headers.get('origin')!==new URL(r.url).origin)return Response.json({error:'Origin tidak sah.'},{status:403});
 if(!env.DB)return Response.json({error:'D1 tidak tersedia.'},{status:503});
 const size=Number(r.headers.get('content-length')||0);
 if(size>MAX_MEDIA_BYTES+100000)return Response.json({error:'Gambar terlalu besar.'},{status:413});
 try{
  const form=await r.formData();
  const file=form.get('image');
  if(!(file instanceof File)||file.size<1||file.size>MAX_MEDIA_BYTES)return Response.json({error:'Pilih imej maksimum 750 KB.'},{status:400});
  const bytes=new Uint8Array(await file.arrayBuffer()),mime=detectImageMime(bytes);
  if(!mime)return Response.json({error:'Hanya imej PNG, JPG, WebP atau AVIF dibenarkan.'},{status:415});
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const id=Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
  const result=await env.DB.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(byte_size),0) AS bytes FROM cms_media').first<any>();
  if(Number(result?.count)>=300||Number(result?.bytes)+bytes.length>150000000)return Response.json({error:'Had storan imej dicapai.'},{status:507});
  await env.DB.prepare('INSERT OR IGNORE INTO cms_media(id,mime,bytes,byte_size) VALUES (?,?,?,?)').bind(id,mime,bytes,bytes.length).run();
  return Response.json({url:'/media/'+id,mime,size:bytes.length},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('CMS media upload',e);return Response.json({error:'Gagal memuat naik gambar.'},{status:500});}
}
