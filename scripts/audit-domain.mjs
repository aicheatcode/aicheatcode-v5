// Read-only DNS / HTTPS / HTTP production check. No Cloudflare token required.
import {resolve4,resolveNs} from 'node:dns/promises';
import tls from 'node:tls';
import assert from 'node:assert/strict';
export const expectedHost='cannybrainy.com';
export function tlsCheck(hostname,port=443){
 return new Promise((resolve,reject)=>{
  const socket=tls.connect({host:hostname,port,servername:hostname,rejectUnauthorized:true,timeout:10000},()=>{
   const cert=socket.getPeerCertificate();
   const result={authorized:socket.authorized,validTo:cert.valid_to,protocol:socket.getProtocol(),subject:cert.subject?.CN};
   socket.end();resolve(result);
  });
  socket.once('timeout',()=>{socket.destroy();reject(Error('TLS timeout'));});
  socket.once('error',reject);
 });
}
export async function auditDomain({host=expectedHost,fetchImpl=fetch,log=console.log}={}){
 assert(/^[a-z0-9.-]+$/.test(host),'Invalid hostname');
 const report={host,status:'BLOCKED',dns:{},https:{},http:{}};
 try{
  report.dns.nameservers=await resolveNs(host);
  report.dns.addresses=await resolve4(host);
  report.https=await tlsCheck(host);
  const response=await fetchImpl('https://'+host+'/api/health',{signal:AbortSignal.timeout(12000),redirect:'manual'});
  report.http.healthStatus=response.status;
  if(response.status===200){
   const body=await response.json();
   report.http.workerCommit=body.commit??null;
   report.http.database=body.database??null;
   report.http.promptCount=body.promptCount??null;
  }else await response.body?.cancel();
  const page=await fetchImpl('https://'+host+'/',{signal:AbortSignal.timeout(12000),redirect:'manual'});
  report.http.homeStatus=page.status;
  await page.body?.cancel();
  report.status=report.https.authorized&&report.http.healthStatus===200&&report.http.homeStatus===200&&report.http.database==='d1'?'PASS':'BLOCKED';
 }catch(e){report.reason=e.message;report.status='BLOCKED';}
 log(JSON.stringify(report,null,2));
 if(report.status!=='PASS')throw Error('Domain DNS/SSL/Worker UAT remains BLOCKED');
 return report;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 auditDomain().catch(e=>{console.error(e.message);process.exitCode=1;});
}
