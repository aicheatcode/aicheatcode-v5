import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const db=env.DB;
 if(!db)return Response.json({error:'Database unavailable'},{status:503});
 const url=new URL(request.url);
 const q=(url.searchParams.get('q')||'').trim().slice(0,150);
 const category=(url.searchParams.get('category')||'').trim().slice(0,100);
 const limit=Math.min(Math.max(Number(url.searchParams.get('limit'))||30,1),100);
 const page=Math.min(Math.max(Number(url.searchParams.get('page'))||1,1),100000);
 try{
  const where:string[]=[];const args:string[]=[];
  if(q){where.push('(title LIKE ? OR prompt_text LIKE ?)');args.push('%'+q+'%','%'+q+'%')}
  if(category){where.push('category = ?');args.push(category)}
  const clause=where.length?' WHERE '+where.join(' AND '):'';
  const result=await db.prepare('SELECT id,title,category,prompt_text,source_url,test_status,origin FROM prompt_records'+clause+' ORDER BY id LIMIT ? OFFSET ?').bind(...args,limit,(page-1)*limit).all();
  return Response.json({prompts:result.results??[],page,limit},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('prompts database error',e);return Response.json({error:'Database query failed'},{status:503})}
}
