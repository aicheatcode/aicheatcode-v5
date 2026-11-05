import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePage,renderSections} from '../lib/site-cms.mjs';
const sample={slug:'home',title:'Belajar AI',description:'Percuma',sections:[{id:'s1',type:'tutorial',title:'Mula',body:'Langkah 1'}],published:false};
test('valid CMS content accepted and order preserved',()=>{
 const p=validatePage(sample);assert.equal(p.sections[0].position,0);assert.equal(p.published,false);
});
test('reject unsafe schemes, duplicate ids, and untrusted markup output',()=>{
 assert.throws(()=>validatePage({...sample,imageUrl:'javascript:alert(1)'}));
 assert.throws(()=>validatePage({...sample,sections:[sample.sections[0],sample.sections[0]]}));
 assert.throws(()=>validatePage({...sample,sections:[{...sample.sections[0],url:'http://example.com'}]}));
 const h=renderSections([{id:'a',type:'text',title:'<img src=x>',body:'<script>alert(1)</script>'}]);
 assert(!h.includes('<script>'));assert(!h.includes('<img src=x>'));
});
