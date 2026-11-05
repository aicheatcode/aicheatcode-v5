// Production-only read-only verification of the actual apex domain.
// Cloudflare Worker success is not equivalent to DNS/SSL/custom-domain success.
import {writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
const origin='https://cannybrainy.com',commit=process.env.GITHUB_SHA||'';
const report={checkedAt:new Date().toISOString(),domain:origin,expectedCommit:commit,status:'BLOCKED',checks:[]};
const output=resolve('.cloudflare/production/domain-report.json');
const record=(name,status,detail)=>report.checks.push({name,status,detail});
async function get(path){
 const res=await fetch(origin+path,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{'cache-control':'no-cache'}});
 return {status:res.status,text:await res.text()};
}
try{
 const health=await get('/api/health');
 if(health.status!==200)throw Error('Health HTTP '+health.status);
 let data;try{data=JSON.parse(health.text)}catch{throw Error('Health endpoint did not return JSON');}
 if(data.status!=='ok'||data.database!=='d1'||data.commit!==commit)throw Error('Domain is serving a different origin or commit');
 record('HTTPS/TLS and domain routing','PASS','Valid TLS connection, expected Cloudflare Worker commit and D1 health');
 const home=await get('/');
 if(home.status!==200||!home.text.includes('/hub.css')||home.text.includes('/styles.css?v=20261102-repaired'))throw Error('Public domain is not serving the V5 homepage');
 record('V5 public homepage','PASS','Default homepage is V5');
 const editor=await get('/api/editor'),cms=await get('/api/site-cms');
 if(editor.status!==403||cms.status!==403)throw Error('Anonymous CMS/API access not denied');
 record('Anonymous owner access','PASS','GET /api/editor and /api/site-cms return 403');
 report.status='PASS';
}catch(e){
 record('Primary domain readiness','BLOCKED',String(e.message).slice(0,250));
}
mkdirSync(resolve('.cloudflare/production'),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(report.status!=='PASS'){
 console.error('Primary domain verification failed. GitHub Actions must not report a successful go-live when cannybrainy.com is BLOCKED.');
 process.exitCode=1;
}
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n## cannybrainy.com DNS/SSL and V5 verification: '+report.status+'\n\n'+report.checks.map(x=>'- '+x.name+': '+x.status+' — '+x.detail).join('\n')+'\n');
