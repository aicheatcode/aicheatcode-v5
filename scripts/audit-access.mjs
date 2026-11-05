// Read-only production Access audit: fails closed and never prints credentials.
import assert from 'node:assert/strict';

export const PROTECTED_PATHS=[
 '/studio.html','/admin.html','/api/site-cms','/api/cms-media','/api/editor'
];
const required=['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','CF_ACCESS_TEAM_DOMAIN','CF_ACCESS_AUD','CMS_OWNER_EMAIL'];
function hostPath(value){
 try {
  const str=String(value||'').trim().replace(/^https?:\/\//,'');
  const slash=str.indexOf('/');
  return {host:(slash<0?str:str.slice(0,slash)).toLowerCase(),path:slash<0?'/':str.slice(slash)};
 }catch{return {host:'',path:''};}
}
export function coversPath(record,path,hostname){
 const {host,path:base}=hostPath(record?.uri||record?.domain||record);
 if(host!==hostname.toLowerCase())return false;
 // Conservative match: exact route or full /api/* family, not accidental /api/site prefix.
 if(base===path)return true;
 if(base==='/*')return true;
 if(base.endsWith('/*'))return path.startsWith(base.slice(0,-1));
 return false;
}
export function accessDestinations(app){
 const list=[...(app.destinations||[]),...(app.self_hosted_domains||[])];
 if(app.domain)list.push({domain:app.domain});
 return list;
}
export function policyOnlyOwner(policies,email){
 if(!Array.isArray(policies)||policies.length===0)return false;
 const allow=policies.filter(p=>p.decision==='allow');
 if(allow.length!==1||policies.some(p=>p.decision==='bypass'))return false;
 const rules=allow[0].include||[];
 return rules.length===1&&
    typeof rules[0]?.email?.email==='string'&&
    rules[0].email.email.toLowerCase()===email.toLowerCase() &&
    !(allow[0].exclude||[]).length;
}
export async function auditAccess({env=process.env,fetchImpl=fetch,log=console.log}={}){
 const missing=required.filter(k=>!String(env[k]||'').trim());
 if(missing.length)throw Error('BLOCKED: missing environment keys: '+missing.join(', '));
 assert(/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID),'Invalid account ID');
 assert(/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(env.CF_ACCESS_TEAM_DOMAIN),'Invalid Access team domain');
 assert(/^[a-z0-9]{32,64}$/i.test(env.CF_ACCESS_AUD),'Invalid Access AUD');
 assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.CMS_OWNER_EMAIL),'Invalid owner email');
 const api=async path=>{
  const response=await fetchImpl('https://api.cloudflare.com/client/v4'+path,{
   headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Accept':'application/json'},
   signal:AbortSignal.timeout(20000),redirect:'error'
  });
  if(!response.ok)throw Error('BLOCKED: Cloudflare Access read permission/API failed (HTTP '+response.status+'); no changes performed');
  const data=await response.json();
  if(!data.success)throw Error('BLOCKED: Cloudflare Access read returned an API error');
  return data.result;
 };
 const apps=await api('/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/access/apps?per_page=100');
 if(!Array.isArray(apps))throw Error('BLOCKED: Access apps returned invalid data');
 const matching=apps.filter(a=>a.aud===env.CF_ACCESS_AUD&&a.type==='self_hosted');
 if(matching.length!==1)throw Error('BLOCKED: expected exactly one Self-hosted Access app for configured AUD');
 const app=await api('/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/access/apps/'+matching[0].id);
 const configured=accessDestinations(app);
 const domains=String(env.ACCESS_PROTECTED_HOSTS||'cannybrainy.com').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 const uncovered=[];
 for(const hostname of domains)for(const path of PROTECTED_PATHS){
  if(!configured.some(d=>coversPath(d,path,hostname)))uncovered.push(hostname+path);
 }
 if(uncovered.length)throw Error('BLOCKED: Access application missing protected routes: '+uncovered.join(', '));
 const policies=await api('/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/access/apps/'+app.id+'/policies?per_page=100');
 if(!policyOnlyOwner(policies,env.CMS_OWNER_EMAIL))throw Error('BLOCKED: owner-only Access allow policy not confirmed');
 log('PASS: Access app, 5 protected paths per configured hostname, and single-email policy verified. Email/token withheld.');
 return {status:'PASS',hostnames:domains,paths:PROTECTED_PATHS.length,appId:app.id};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 auditAccess().catch(error=>{console.error(String(error.message));process.exitCode=1;});
}
