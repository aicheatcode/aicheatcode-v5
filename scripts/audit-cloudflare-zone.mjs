// Cloudflare account-level, READ ONLY check of zone, Worker custom domain and edge DNS.
// It is intentionally separate from browser TLS validation.
import assert from 'node:assert/strict';
export async function auditCloudflareZone({env=process.env,fetchImpl=fetch,log=console.log}={}){
 const id=env.CLOUDFLARE_ACCOUNT_ID, token=env.CLOUDFLARE_API_TOKEN;
 const host=env.CF_CUSTOM_HOSTNAME||'cannybrainy.com',worker=env.CLOUDFLARE_WORKER_NAME||'aicheatcode-v5';
 assert(/^[a-f0-9]{32}$/i.test(id||''),'Missing Cloudflare account ID');
 assert(token&&token.trim(),'Missing Cloudflare API token');
 const api=async path=>{
  const response=await fetchImpl('https://api.cloudflare.com/client/v4'+path,{
   headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw Error('Cloudflare read API failed (HTTP '+response.status+'), check Zone Read / DNS Read / Workers Scripts Read permissions');
  const data=await response.json();
  if(!data.success)throw Error('Cloudflare read API did not return success');
  return data.result;
 };
 const zones=await api('/zones?name='+encodeURIComponent(host));
 assert(Array.isArray(zones),'Expected zone array');
 const zone=zones.find(z=>z.name===host&&z.account?.id===id);
 if(!zone||zone.status!=='active')throw Error('BLOCKED: custom domain is not an active zone in this Cloudflare account');
 const workerDomains=await api('/accounts/'+id+'/workers/domains?hostname='+encodeURIComponent(host));
 const attached=Array.isArray(workerDomains)?workerDomains.find(d=>d.hostname===host&&d.service===worker&&d.enabled===true&&d.zone_id===zone.id):null;
 if(!attached)throw Error('BLOCKED: custom domain is not enabled and attached to expected Worker');
 const dns=await api('/zones/'+zone.id+'/dns_records?name='+encodeURIComponent(host)+'&per_page=100');
 if(!Array.isArray(dns)||!dns.some(x=>['A','AAAA','CNAME'].includes(x.type)&&x.proxied===true))throw Error('BLOCKED: Cloudflare-proxied apex record not confirmed');
 const ssl=await api('/zones/'+zone.id+'/settings/ssl');
 if(!['full','strict'].includes(ssl?.value))throw Error('BLOCKED: SSL mode is not Full or Full (Strict)');
 log('PASS: active zone, Cloudflare proxy, Worker custom domain and SSL encryption mode confirmed (does not prove edge certificate or UAT).');
 return {status:'PASS',zoneStatus:zone.status,worker:attached.service,sslMode:ssl.value,certificateId:attached.cert_id||null};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 auditCloudflareZone().catch(e=>{console.error(e.message);process.exitCode=1;});
}
