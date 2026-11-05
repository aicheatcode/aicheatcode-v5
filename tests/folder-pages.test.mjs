import test from 'node:test';
import assert from 'node:assert/strict';
import {folderPages} from '../lib/folder-pages.generated.mjs';
import {validatePage,applyCmsToHub} from '../lib/cms-core.mjs';
test('Every editable Markdown page has its own valid route',()=>{
 assert(Object.keys(folderPages).length>=8);
 for(const [path,doc] of Object.entries(folderPages)){assert.equal(doc.path,path);assert.deepEqual(validatePage(doc).path,path);assert(doc.blocks.length>=1);}
});
test('Editable content is rendered and escaped',()=>{
 const d=folderPages['/'];
 assert(d.title.includes('LEARN AI.'));
 const page='<html><head><title>Old</title><meta name="description" content="Old"></head><body><main id="content" tabindex="-1">Old</main></body></html>';
 const html=applyCmsToHub(page,d);
 assert(html.includes('LEARN AI.'));
 assert(!html.includes('<script>alert(1)</script>'));
});
test('All listed learning pages exist',()=>{
 for(const slug of ['prompt-pertama','poster-jelas','brief-visual','semakan-jenama'])assert(folderPages['/belajar/'+slug]);
});
