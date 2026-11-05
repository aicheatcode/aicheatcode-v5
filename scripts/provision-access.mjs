// Creation helper: dry run by default. --apply requires explicit ALLOW_ACCESS_CREATE=YES.
// Never logs an API token, owner email, or sensitive authentication payload.
import assert from 'node:assert/strict';
import {PROTECTED_PATHS} from './audit-access.mjs';
export function applicationPayload({owner,hosts}){
 assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner||''),'Provide valid CMS_OWNER_EMAIL');
 const destinations=hosts.flatMap(host=>{
  assert(/^[a-z0-9.-]+$/.test(host),'Invalid Access hostname');
  return PROTECTED_PATHS.map(path=>({type:'public',uri:host+path}));
 });
 return {name:'AICHEATCODE V5 — Owner CMS',type:'self_hosted',session_duration:'8h',destinations,policies:[{name:'Owner email only',decision:'allow',include:[{email:{email:owner}}],precedence:1}]};
}
export async function provisionAccess({env=process.env,apply=process.argv.includes('--apply'),fetchImpl=fetch,log=console.log}={}){
 const id=env.CLOUDFLARE_ACCOUNT_ID,token=env.CLOUDFLARE_API_TOKEN;
 assert(/^[a-f0-9]{32}$/i.test(id||''),'Account ID missing');
 assert(token,'API Token missing');
 const hosts=String(env.ACCESS_PROTECTED_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 assert(hosts.includes('cannybrainy.com'),'Production hostname must be listed');
 assert(hosts.length>=2,'Include production AND publicly reachable workers.dev hostname before creating app');
 const payload=applicationPayload({owner:env.CMS_OWNER_EMAIL,hosts});
 const url='https://api.cloudflare.com/client/v4/accounts/'+id+'/access/apps';
 const request=async (method,body)=>{
  const response=await fetchImpl(url,{
   method,headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000),redirect:'error'
  });
  if(!response.ok)throw Error('Cloudflare Access API '+method+' HTTP '+response.status+' — check Access: Apps and Policies permission');
  const data=await response.json();if(!data.success)throw Error('Cloudflare API rejected Access '+method);
  return data.result;
 };
 const existing=await request('GET');
 if(!Array.isArray(existing))throw Error('Invalid Access app list');
 if(existing.some(x=>x.name===payload.name))throw Error('A named Access app already exists: inspect it; will not overwrite');
 if(!apply){log('DRY RUN: would create owner-only Access app covering '+hosts.length+' hostnames and '+PROTECTED_PATHS.length+' paths each.');return {status:'DRY_RUN',hostnames:hosts,paths:PROTECTED_PATHS.length};}
 if(env.ALLOW_ACCESS_CREATE!=='YES')throw Error('Set ALLOW_ACCESS_CREATE=YES only after validating dry run');
 const created=await request('POST',payload);
 assert(created?.id&&created?.aud,'Cloudflare did not return Access application ID and AUD');
 log('Access application created; save returned AUD in GitHub repository variable CF_ACCESS_AUD. Owner email/token withheld.');
 return {status:'CREATED',id:created.id,aud:created.aud};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 provisionAccess().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
