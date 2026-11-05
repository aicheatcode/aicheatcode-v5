// Rebuild public prompt datasets from individually editable files.
// Never alter original prompt text; edits are applied only from user-owned JSON files.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=resolve(fileURLToPath(new URL('../content/prompts/',import.meta.url)));
const legacyDir=join(dir,'legacy');
const curatedPath=resolve(fileURLToPath(new URL('../public/curated-prompts.json',import.meta.url)));
const dataPath=resolve(fileURLToPath(new URL('../public/data.json',import.meta.url)));
function loadJSON(file){
 try{return JSON.parse(readFileSync(file,'utf8'));}
 catch(error){throw Error('Invalid JSON '+file+': '+error.message);}
}
function validateRecord(record,name){
 if(!record||typeof record!=='object'||Array.isArray(record))throw Error('Invalid prompt '+name);
 if(typeof record.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(record.id))throw Error('Invalid ID: '+name);
 if(basename(name,'.json')!==record.id)throw Error('Filename must equal record ID: '+name);
 for(const key of ['title','category','text','source']){
  if(typeof record[key]!=='string'||!record[key].trim())throw Error('Missing '+key+': '+name);
 }
 for(const [key,val] of Object.entries(record)){
  if(typeof val==='string'&&val.length>80000)throw Error('Field over 80k chars: '+name+':'+key);
 }
 if(typeof record.testStatus==='string'&&record.testStatus.length>150)throw Error('Test status too long: '+name);
 return record;
}
function readFolder(folder){
 const files=readdirSync(folder).filter(x=>x.endsWith('.json')).sort();
 const records=new Map();
 for(const name of files){const item=validateRecord(loadJSON(join(folder,name)),name);if(records.has(item.id))throw Error('Duplicate owner prompt ID: '+item.id);records.set(item.id,item);}
 return records;
}
const legacy=readFolder(legacyDir),owner=readFolder(dir);
if(legacy.size<1070)throw Error('Expected all 1070 archived V5 prompts in content/prompts/legacy');
if(!owner.size)throw Error('No owner prompt JSON files');
for(const id of owner.keys())if(legacy.has(id))throw Error('ID collision between curated and legacy prompt folders: '+id);
const data=loadJSON(dataPath);
if(!Array.isArray(data.prompts))throw Error('Base data.json prompt array missing');
const presentIds=new Set(data.prompts.map(x=>x.id));
const originalCount=data.prompts.length;
const ordered=data.prompts.map(p=>legacy.get(p.id)??p);
for(const [id,p] of legacy)if(!presentIds.has(id))ordered.push(p);
if(new Set(ordered.map(p=>p.id)).size!==ordered.length)throw Error('Duplicate IDs in combined V5 prompts');
data.prompts=ordered;
const curated=[...owner.values()];
writeFileSync(dataPath,JSON.stringify(data,null,2)+'\n');
writeFileSync(curatedPath,JSON.stringify(curated,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',legacy:legacy.size,curated:curated.length,sourceCount:originalCount,compiledCount:ordered.length}));
