import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../content/prompts/legacy/',import.meta.url);
const base=JSON.parse(readFileSync(new URL('../public/data.json',import.meta.url),'utf8'));
test('all 1070 original V5 prompts are individually editable, with intact text and IDs',()=>{
 const files=readdirSync(root).filter(name=>name.endsWith('.json'));
 assert.equal(files.length,1070);
 assert.equal(base.prompts.length,1070);
 const ids=new Set();
 for(const record of base.prompts){
  const name=record.id+'.json';
  assert(files.includes(name),'Lost original prompt: '+record.id);
  const editable=JSON.parse(readFileSync(new URL(name,root),'utf8'));
  assert.equal(editable.id,record.id);
  assert.equal(editable.text,record.text);
  assert.equal(editable.title,record.title);
  assert.equal(editable.source,record.source);
  assert(!ids.has(editable.id)); ids.add(editable.id);
 }
});
test('original neon theme still includes motion with accessibility fallback',()=>{
 const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
 assert(css.includes('--pink:#ff0099'));
 assert(css.includes('--purple:#7000ff'));
 assert(css.includes('--acid:#ccff00'));
 assert(css.includes('@keyframes marquee'));
 assert(css.includes('@keyframes float'));
});
