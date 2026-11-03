import assert from'node:assert/strict';import{writeFileSync}from'node:fs';const ts=await import('typescript');const fs=await import('node:fs');let compiled=ts.default.transpileModule(fs.readFileSync('lib/site-response.ts','utf8'),{compilerOptions:{module:ts.default.ModuleKind.ESNext,target:ts.default.ScriptTarget.ES2022}}).outputText;compiled=compiled.replace("from './home'","from './home.ts'").replace(/from ('[^']+\.json');/g,"from $1 with {type:'json'};");const temp=new URL('../lib/.server-test.mjs',import.meta.url);fs.writeFileSync(temp,compiled);const {servePage}=await import(temp.href);fs.unlinkSync(temp);const rows=[];async function test(id,path,fn){try{const r=await servePage(new Request('https://cannybrainy.com'+path));await fn(r,await r.text());rows.push({id,status:'PASS'});}catch(e){rows.push({id,status:'FAIL',actual:e.message});}}
await test('HTTP-home','/',(r,h)=>{assert.equal(r.status,200);assert(h.includes('LEARN AI.'));assert(!h.includes('/app.js'));});
await test('HTTP-legacy','/?legacy=1',(r,h)=>{assert.equal(r.status,200);assert(h.includes('/app.js'));});
await test('HTTP-study','/belajar/study-lab',(r,h)=>{assert.equal(r.status,200);assert(h.includes('sandbox="allow-scripts"'));assert(h.includes('/tools/study-lab.html'));});
await test('HTTP-prompt-detail','/prompt/TASK-052401?varian=CSV-052492',(r,h)=>{assert.equal(r.status,200);assert(h.includes('Food business'));assert(h.includes('CSV-052492'));assert(h.includes('https://cannybrainy.com/prompt/TASK-052401'));assert(h.includes('noindex,follow'));});
await test('HTTP-private','/prompt/LOCAL-123',(r,h)=>{assert.equal(r.status,200);assert(h.includes('noindex,follow'));assert(!h.includes('secret private input'));});
await test('HTTP-invalid','/this-path-does-not-exist',(r,h)=>assert.equal(r.status,404));
await test('HTTP-invalid-project','/projek/nope',(r,h)=>assert.equal(r.status,404));
await test('HTTP-invalid-prompt','/prompt/CSV-999999',(r,h)=>assert.equal(r.status,404));
await test('HTTP-robots','/robots.txt',(r,h)=>{assert.equal(r.status,200);assert(h.includes('Disallow: /api/'));});
await test('HTTP-sitemap','/sitemap.xml',(r,h)=>{assert.equal(r.status,200);assert(h.includes('/projek/belajar-arab'));assert(!h.includes('CSV-100000'));});
await test('HTTP-safety','/belajar',(r,h)=>{assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert(r.headers.get('content-security-policy-report-only'));});
await test('HTTP-EN','/belajar?lang=en',(r,h)=>{assert(h.includes('<html lang="en">'));assert(h.includes('One skill.'));});
writeFileSync('docs/verification/server-tests.json',JSON.stringify(rows,null,2));console.log(rows);if(rows.some(x=>x.status==='FAIL'))process.exitCode=1;
