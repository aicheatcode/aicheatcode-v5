// Validated, individual owner prompt files. Preserves prompts verbatim.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=resolve(fileURLToPath(new URL('../content/prompts/',import.meta.url)));
const output=resolve(fileURLToPath(new URL('../public/curated-prompts.json',import.meta.url)));
const files=readdirSync(dir).filter(x=>x.endsWith('.json')).sort();
const prompts=[],seen=new Set();
for(const name of files){
 const path=join(dir,name);let record;
 try{record=JSON.parse(readFileSync(path,'utf8'));}
 catch(e){throw Error('Invalid JSON: '+name+' — '+e.message);}
 if(!record||typeof record!=='object'||Array.isArray(record))throw Error('Invalid prompt: '+name);
 if(typeof record.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(record.id))throw Error('Invalid ID: '+name);
 if(basename(name,'.json')!==record.id)throw Error('Filename must equal prompt ID: '+name);
 if(seen.has(record.id))throw Error('Duplicate prompt ID: '+record.id);
 seen.add(record.id);
 for(const key of ['title','category','text','source']){
  if(typeof record[key]!=='string'||!record[key].trim())throw Error('Missing '+key+': '+name);
 }
 for(const [key,value] of Object.entries(record)){
  if(typeof value!=='string')throw Error('String fields only: '+key+' in '+name);
  if(value.length>24000)throw Error('Field too long: '+key+' in '+name);
 }
 if(!['NOT TESTED','PASS','FAIL'].includes(record.testStatus||'NOT TESTED'))throw Error('Invalid test status: '+name);
 prompts.push(record);
}
if(!prompts.length)throw Error('Owner prompt folder contains no JSON files');
writeFileSync(output,JSON.stringify(prompts,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',files:prompts.length,ids:prompts.map(p=>p.id)}));
