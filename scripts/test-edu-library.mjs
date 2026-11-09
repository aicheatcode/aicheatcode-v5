import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const DIR=path.resolve("public/apps/perpustakaan-tingkatan1");
const files=Object.fromEntries(["index.html","style.css","content.js","app.js"].map(name=>[name,fs.readFileSync(path.join(DIR,name),"utf8")]));
const globalContext={window:{}};
vm.runInNewContext(files["content.js"],globalContext,{filename:"content.js"});
const books=globalContext.window.AICHEATCODE_SUBJECTS;
assert.equal(books.length,11,"11 unique collections are required");
assert.equal(new Set(books.map(b=>b.id)).size,11,"Duplicate subject ID");
assert.equal(books.reduce((n,b)=>n+b.qa.length,0),55,"Exactly 55 objective questions");
assert.ok(files["index.html"].includes('src="./content.js"'));
assert.ok(files["index.html"].includes('src="./app.js"'));
assert.ok(files["index.html"].includes('name="viewport"'));
assert.ok(files["style.css"].includes("@media(max-width:590px)"));
assert.ok(files["style.css"].includes(":focus-visible"));
assert.ok(files["app.js"].includes("indexedDB"),"Device-local PDF persistence required");
assert.ok(!files["app.js"].includes("api.openai.com"),"No client-side API key or AI endpoint");

for(const book of books){
  assert.ok(book.name&&book.source&&Array.isArray(book.topics));
  assert.ok(book.notes.length>=3);
  assert.equal(book.qa.length,5,book.name+" must have 5 questions");
  for(const q of book.qa){
    assert.equal(q.length,5,"Question must have stem + 4 choices");
    assert.equal(new Set(q.slice(1)).size,4,"Options must be distinct");
    assert.ok(q.every(t=>typeof t==="string"&&t.trim()));
  }
}
const appScript=new vm.Script(files["app.js"],{filename:"app.js"});

function simulate(hash,answers=null){
  const nodes={},listeners={},storage=new Map();
  const el=id=>nodes[id]??(nodes[id]={
    innerHTML:"",textContent:"",className:"",style:{},
    classList:{toggle(){}},setAttribute(){}
  });
  const document={
    getElementById:el,
    addEventListener(type,handler){listeners[type]=handler},
    querySelector(){return el("flash")},
    querySelectorAll(){return []},
    createElement(){return {style:{},focus(){},select(){},remove(){},click(){}}},
    body:{appendChild(){}},
    title:""
  };
  const window={AICHEATCODE_SUBJECTS:books,AICHEATCODE_KPM_INDEX:globalContext.window.AICHEATCODE_KPM_INDEX,addEventListener(){},scrollTo(){}};
  const localStorage={getItem(key){return storage.get(key)||null},setItem(key,v){storage.set(key,v)}};
  const location={hash};
  class MockFormData{constructor(form){this.form=form}get(key){return this.form.values[key]}}
  const context={window,document,location,localStorage,FormData:MockFormData,
    URL:{createObjectURL(){return "blob:mock-pdf"},revokeObjectURL(){}},
    confirm(){return true},navigator:{clipboard:{writeText:async()=>{}}},
    setTimeout(){return 1},clearTimeout(){},
    console:{info(){}}
  };
  vm.createContext(context);
  appScript.runInContext(context);
  if(answers){
    const form={id:"quizform",values:answers,querySelectorAll(){return []}};
    assert.ok(listeners.submit,"Submit listener missing");
    listeners.submit({target:form,preventDefault(){}});
  }
  return {nodes,listeners,storage,window,document,location};
}

let rendered=0;
for(const s of books)for(const tab of ["book","notes","flash","quiz","prompts"]){
  const r=simulate("#/subject/"+s.id+"/"+tab);
  const output=r.nodes.app.innerHTML;
  assert.ok(output.includes(s.name.replace(/&/g,"&amp;")),s.id+"/"+tab+" title missing");
  if(tab==="quiz")assert.ok(output.includes('id="quizform"'),s.id+" quiz missing");
  if(tab==="book")assert.ok(output.includes('id="pdf-input"'),s.id+" PDF picker missing");
  if(tab==="flash")assert.ok(output.includes('data-flip'),s.id+" flash action missing");
  if(tab==="prompts")assert.equal((output.match(/data-copy=/g)||[]).length,4,s.id+" prompt count");
  rendered++;
}
for(const hash of ["#/library","#/progress","#/help","#/invalid"]){
  assert.ok(simulate(hash).nodes.app.innerHTML.length>30,hash+" blank");
  rendered++;
}
let graded=0;
for(const s of books){
  const perfect=Object.fromEntries(s.qa.map((q,i)=>["q"+i,q[1]]));
  const r=simulate("#/subject/"+s.id+"/quiz",perfect);
  const saved=JSON.parse(r.storage.get("AICHEATCODE_EDU_SCORES"));
  assert.equal(saved[s.id].last,5,s.id+" grading score");
  assert.equal(saved[s.id].best,5,s.id+" best score");
  assert.match(r.nodes["grade-result"].innerHTML,/5\/5/);
  graded++;
}
// An unanswered quiz must not silently become a score.
const skipped=simulate("#/subject/"+books[0].id+"/quiz",{q0:books[0].qa[0][1]});
assert.equal(skipped.storage.has("AICHEATCODE_EDU_SCORES"),false);
// Search filters visible catalog cards.
const searchTest=simulate("#/library");
searchTest.listeners.input({target:{id:"search",value:"Muzik"}});
assert.ok(searchTest.nodes.results.innerHTML.includes("Pendidikan Muzik"));
assert.ok(!searchTest.nodes.results.innerHTML.includes("Matematik"));

console.log(JSON.stringify({status:"PASS",subjects:books.length,questions:55,routes:rendered,quiz_grades:graded,pdf_storage:"code path present, browser test required",mobile_css:"present"},null,2));
