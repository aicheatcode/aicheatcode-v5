// Build safe CMS documents from independently editable Markdown files.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {relative,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validatePage,safeLink} from '../lib/cms-core.mjs';
const root=resolve(fileURLToPath(new URL('../content/pages/',import.meta.url)));
const target=fileURLToPath(new URL('../lib/folder-pages.generated.mjs',import.meta.url));
const docs={};
function files(dir){
 return readdirSync(dir,{withFileTypes:true}).flatMap(ent=>ent.isDirectory()?files(join(dir,ent.name)):ent.isFile()&&ent.name.endsWith('.md')?[join(dir,ent.name)]:[]);
}
function parse(file){
 const name=relative(root,file).replaceAll('\\','/').replace(/\.md$/,'');
 const path=name==='home'?'/':'/'+name;
 const lines=readFileSync(file,'utf8').replaceAll('\r\n','\n').split('\n');
 const first=lines.find(line=>line.trim());
 if(!first?.startsWith('# '))throw Error(file+': first line must be # Page title');
 const title=first.slice(2).trim(),description=lines.find(x=>x.startsWith('> '))?.slice(2).trim()||'';
 const blocks=[];let heading=title,body=[],firstBlock=true,sequence=0;
 const flush=()=>{
  const text=body.join('\n').trim();body=[];
  if(!text&&!firstBlock)return;
  blocks.push({id:'section-'+(++sequence),type:firstBlock?'hero':'text',title:heading,text,href:firstBlock&&path==='/'?'/belajar':'',label:firstBlock&&path==='/'?'Mula belajar':''});
  firstBlock=false;
 };
 for(const raw of lines.slice(lines.indexOf(first)+1)){
  const line=raw.trimEnd();
  if(line.startsWith('> ')&&description===line.slice(2).trim())continue;
  if(line.startsWith('## ')){flush();heading=line.slice(3).trim();continue;}
  let m;
  if((m=/^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim()))){
   flush();if(!safeLink(m[2]))throw Error(file+': invalid image URL');
   blocks.push({id:'section-'+(++sequence),type:'image',title:'',text:'',image:m[2],alt:m[1]});continue;
  }
  if((m=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(line.trim()))){
   flush();if(!safeLink(m[2]))throw Error(file+': invalid link');
   blocks.push({id:'section-'+(++sequence),type:'cta',title:m[1],text:'',label:'Buka →',href:m[2]});continue;
  }
  body.push(line);
 }
 flush();
 const document=validatePage({path,title,description,blocks});
 if(docs[path])throw Error('Duplicate page '+path);
 docs[path]=document;
}
files(root).sort().forEach(parse);
if(!docs['/'])throw Error('Missing home.md');
writeFileSync(target,'// Generated from content/pages/*.md. Edit Markdown, not this file.\nexport const folderPages='+JSON.stringify(docs,null,2)+';\n');
console.log(JSON.stringify({status:'PASS',pages:Object.keys(docs).length,paths:Object.keys(docs)}));
