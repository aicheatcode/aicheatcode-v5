/* AICHEATCODE Digital Library – vanilla JS, no dependencies, no API key */
(()=>{"use strict";
const BOOKS=window.LIBRARY_BOOKS||[];
const TABS=["Buku Digital","Nota Ringkas","Kad Imbasan","Kuiz Automatik","Prompt AI"];
const state={subject:0,tab:0,card:0,flipped:false,answers:{},pdfObjectUrl:null,pdfFile:null};
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusKey=id=>"aicheatcode.library.score."+id;
const linkKey=id=>"aicheatcode.library.link."+id;
const grades=()=>BOOKS.filter(b=>localStorage.getItem(statusKey(b.id))!==null).length;
let currentLoad=0;
let dbPromise;
function openDB(){
 if(!("indexedDB" in window))return Promise.reject(Error("Pelayar tidak menyokong penyimpanan PDF."));
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open("aicheatcode-library-books",1);
  req.onupgradeneeded=()=>req.result.createObjectStore("pdfs",{keyPath:"id"});
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error("Pangkalan data tidak tersedia"));
 });
 return dbPromise;
}
async function loadLocal(id){
 try{const db=await openDB();return await new Promise((resolve,reject)=>{
 const req=db.transaction("pdfs","readonly").objectStore("pdfs").get(id);
 req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
 });}catch(e){return null}
}
async function saveLocal(id,file){
 const db=await openDB();return new Promise((resolve,reject)=>{
 const tx=db.transaction("pdfs","readwrite");tx.objectStore("pdfs").put({id,name:file.name,file});
 tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error("Gagal menyimpan PDF."));
 });
}
async function removeLocal(id){
 try{const db=await openDB();await new Promise((resolve,reject)=>{
 const tx=db.transaction("pdfs","readwrite");tx.objectStore("pdfs").delete(id);
 tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 });}catch(e){}
}
function releasePDF(){if(state.pdfObjectUrl){URL.revokeObjectURL(state.pdfObjectUrl);state.pdfObjectUrl=null}state.pdfFile=null}
function bestScore(book){const n=localStorage.getItem(statusKey(book.id));return n===null?null:Number(n)}
function pickSubject(index){
 if(index===state.subject)return;
 releasePDF();state.subject=index;state.tab=0;state.card=0;state.flipped=false;state.answers={};
 render();window.scrollTo({top:0,behavior:"smooth"});
}
function renderSubjectNav(){
 const search=($("#searchBooks")?.value||"").trim().toLowerCase();
 const category=$("#categoryFilter")?.value||"Semua";
 const wrap=$("#subjectList");
 const match=BOOKS.map((book,index)=>({book,index})).filter(({book})=>
  (category==="Semua"||book.group===category)&&
  (book.name+" "+book.short+" "+book.cards.map(c=>c[0]).join(" ")).toLowerCase().includes(search));
 wrap.innerHTML=match.map(({book,index})=>'<button type="button" class="subject '+(index===state.subject?"active":"")+
 '" data-subject="'+index+'" aria-current="'+(index===state.subject?"page":"false")+'"><span class="symbol" aria-hidden="true">'+escapeHTML(book.icon)+
 '</span><span><span class="name">'+escapeHTML(book.name)+'</span><span class="micro">'+escapeHTML(book.group)+'</span></span></button>').join("")||
 '<p class="muted">Tiada subjek ditemui.</p>';
 $$("[data-subject]",wrap).forEach(button=>button.addEventListener("click",()=>pickSubject(Number(button.dataset.subject))));
}
function renderShell(){
 const book=BOOKS[state.subject],score=bestScore(book);
 $("#activeSubject").textContent=book.name;
 $("#activeMeta").textContent=book.group+" · Tingkatan 1";
 $("#bestScore").textContent=score===null?"Belum kuiz":"Skor terbaik "+score+"/4";
 $("#heroProgress").textContent=grades()+" / "+BOOKS.length+" subjek sudah dicuba";
 $("#tabList").innerHTML=TABS.map((name,i)=>
  '<button type="button" class="tab '+(i===state.tab?"active":"")+'" role="tab" aria-selected="'+(i===state.tab)+
  '" data-tab="'+i+'">'+name+'</button>').join("");
 $$("[data-tab]").forEach(b=>b.addEventListener("click",()=>{state.tab=Number(b.dataset.tab);state.flipped=false;state.card=0;state.answers={};renderShell();renderSection()}));
}
function render(){
 renderSubjectNav();renderShell();renderSection();
}
function renderSection(){
 const book=BOOKS[state.subject],view=$("#section");
 view.innerHTML="";view.setAttribute("aria-label",TABS[state.tab]);
 const myTurn=++currentLoad;
 if(state.tab===0)renderBook(book,view,myTurn);
 if(state.tab===1)renderNotes(book,view);
 if(state.tab===2)renderCards(book,view);
 if(state.tab===3)renderQuiz(book,view);
 if(state.tab===4)renderPrompts(book,view);
}
function sourceFooter(book){
 return '<div class="source"><strong>Rujukan:</strong> '+escapeHTML(book.reference)+
 '<div>Nota, kad imbasan dan kuiz ialah bahan pembelajaran ringkas, bukan petikan penuh atau skema rasmi peperiksaan.</div></div>';
}
function renderNotes(book,view){
 view.innerHTML='<h3 class="sectionTitle">Nota ringkas · '+escapeHTML(book.short)+'</h3>'+
 '<p class="muted">Empat konsep pilihan untuk ulang kaji. Baca buku teks bagi contoh dan penerangan tambahan.</p>'+
 '<div class="cardgrid">'+book.cards.map((c,i)=>'<article class="note"><span class="noteLabel">Konsep '+(i+1)+
 '</span><h3>'+escapeHTML(c[0])+'</h3><p>'+escapeHTML(c[1])+'</p></article>').join("")+'</div>'+sourceFooter(book);
}
function renderCards(book,view){
 state.card=0;state.flipped=false;
 view.innerHTML='<h3 class="sectionTitle">Kad imbasan</h3><p class="muted">Tekan kad untuk membalikkan soalan kepada jawapan.</p>'+
 '<button class="flash" id="flashCard" type="button" aria-label="Balik kad imbasan"><span id="flashInside"></span></button>'+
 '<div class="cardnav"><button class="button light" id="prevCard" type="button">← Sebelum</button>'+
 '<span class="counter" id="cardCount"></span><button class="button" id="nextCard" type="button">Seterusnya →</button></div>'+
 sourceFooter(book);
 const update=()=>{
  const card=book.cards[state.card];
  $("#flashInside").innerHTML='<span class="label">'+(state.flipped?"Jawapan":"Istilah")+'</span><strong>'+
   escapeHTML(state.flipped?card[1]:card[0])+'</strong><em>Tekan untuk '+(state.flipped?"lihat istilah":"lihat jawapan")+'</em>';
  $("#cardCount").textContent=(state.card+1)+" / "+book.cards.length;
 };
 $("#flashCard").onclick=()=>{state.flipped=!state.flipped;update()};
 $("#prevCard").onclick=()=>{state.card=(state.card-1+book.cards.length)%book.cards.length;state.flipped=false;update()};
 $("#nextCard").onclick=()=>{state.card=(state.card+1)%book.cards.length;state.flipped=false;update()};
 update();
}
function permutations(i){
 const layouts=[[1,2,0,3],[0,2,3,1],[2,3,1,0],[1,3,2,0]];
 return layouts[i%layouts.length];
}
function renderQuiz(book,view){
 state.answers={};
 view.innerHTML='<h3 class="sectionTitle">Kuiz automatik</h3><p class="muted">Empat soalan, empat pilihan jawapan, satu jawapan betul. Markah akan dikira selepas semua dijawab.</p>'+
 '<div id="quizQuestions">'+book.cards.map((card,i)=>
 '<div class="question"><h3>'+(i+1)+'. Apakah maksud '+escapeHTML(card[0])+'?</h3>'+
 permutations(i).map((j,pos)=>
 '<button type="button" class="choice" data-q="'+i+'" data-option="'+j+'"><span class="letter">'+String.fromCharCode(65+pos)+'</span><span>'+
 escapeHTML(book.cards[j][1])+'</span></button>').join("")+'</div>').join("")+'</div>'+
 '<div class="actions"><button id="markQuiz" type="button" class="button orange">Semak jawapan</button>'+
 '<button id="resetQuiz" type="button" class="button light">Cuba lagi</button></div><div id="quizResult" aria-live="polite"></div>'+sourceFooter(book);
 $$("[data-q]").forEach(button=>button.onclick=()=>{
  const q=Number(button.dataset.q),answer=Number(button.dataset.option);
  state.answers[q]=answer;
  $$('[data-q="'+q+'"]').forEach(candidate=>{
   const selected=candidate===button;
   candidate.classList.toggle("selected",selected);
   candidate.setAttribute("aria-pressed",String(selected));
  });
  $("#quizResult").innerHTML="";
 });
 $("#markQuiz").onclick=()=>{
  if(Object.keys(state.answers).length!==book.cards.length){
   $("#quizResult").innerHTML='<p class="booktip">Jawab semua empat soalan sebelum semak markah.</p>';return;
  }
  const mark=book.cards.reduce((sum,c,i)=>sum+(state.answers[i]===i?1:0),0);
  const previous=bestScore(book),best=Math.max(mark,previous??0);
  try{localStorage.setItem(statusKey(book.id),String(best))}catch(e){}
  const explanations=book.cards.map((card,i)=>
   '<li><strong>'+(state.answers[i]===i?"Betul":"Perlu ulang kaji")+
   ' · '+escapeHTML(card[0])+'</strong><div>'+escapeHTML(card[1])+'</div></li>').join("");
  $("#quizResult").innerHTML='<div class="quizResult"><span class="tag">Keputusan kuiz</span><h3>'+mark+' / '+
   book.cards.length+' · '+Math.round(mark/book.cards.length*100)+'%</h3><p class="muted">Skor terbaik: '+best+'/'+book.cards.length+
   '. Semak penerangan jawapan di bawah.</p><ol>'+explanations+'</ol></div>';
  renderSubjectNav();$("#bestScore").textContent="Skor terbaik "+best+"/4";$("#heroProgress").textContent=grades()+" / "+BOOKS.length+" subjek sudah dicuba";
 };
 $("#resetQuiz").onclick=()=>renderQuiz(book,view);
}
function promptsFor(book){
 const names=book.cards.map(c=>c[0]);
 return [
  "Bertindak sebagai tutor "+book.name+" Tingkatan 1. Terangkan konsep \""+names[0]+
  "\" dengan bahasa mudah. Berikan dua contoh yang tepat, tiga soalan latihan dan jawapan selepas saya mencuba. Jika fakta tidak dapat disahkan, nyatakan batasannya.",
  "Berdasarkan tajuk \""+names[1]+"\" bagi "+book.name+
  " Tingkatan 1, hasilkan nota ringkas dan lima kad imbasan soal-jawab. Gunakan kandungan buku teks yang saya berikan sebagai rujukan utama. Jangan reka nombor halaman atau petikan.",
  "Cipta lima soalan objektif "+book.name+" Tingkatan 1 meliputi "+names.join(", ")+
  ". Sediakan empat pilihan yang munasabah bagi setiap soalan. Tunjukkan jawapan selepas saya menjawab, berserta penerangan ringkas dan sumber topik."
 ];
}
async function copyText(text,button){
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
  else{
   const tmp=document.createElement("textarea");tmp.value=text;tmp.style.position="fixed";tmp.style.opacity="0";document.body.append(tmp);
   tmp.select();if(!document.execCommand("copy"))throw Error("Gagal menyalin");tmp.remove();
  }
  button.textContent="Disalin ✓";setTimeout(()=>{if(button.isConnected)button.textContent="Salin prompt"},1700);
 }catch(e){window.prompt("Salin teks ini:",text)}
}
function renderPrompts(book,view){
 const prompts=promptsFor(book);
 view.innerHTML='<h3 class="sectionTitle">Prompt AI untuk '+escapeHTML(book.short)+'</h3>'+
 '<p class="muted">Prompt pembelajaran yang dihasilkan untuk AICHEATCODE. Ini bukan prompt rasmi OpenAI, Google atau penyedia AI lain.</p>'+
 prompts.map((prompt,i)=>'<article class="promptbox"><span class="tag">Prompt '+(i+1)+'</span><h3>'+
 ["Fahami konsep","Cipta kad imbasan","Jana latihan kuiz"][i]+'</h3><div class="prompttext">'+escapeHTML(prompt)+
 '</div><div class="actions"><button type="button" class="button outline" data-prompt="'+i+'">Salin prompt</button></div></article>').join("")+sourceFooter(book);
 $$("[data-prompt]").forEach(button=>button.onclick=()=>copyText(prompts[Number(button.dataset.prompt)],button));
}
function validHTTPS(value){
 try{const url=new URL(value);return url.protocol==="https:"?url.href:null}catch(e){return null}
}
function showReader(holder,src,filename,isLocal){
 if(!src){holder.innerHTML='<p class="muted">Belum ada PDF dipautkan. Pilih fail PDF pada peranti atau masukkan pautan awan yang sah.</p>';return}
 holder.innerHTML='<div class="actions"><a id="openPDF" class="button" rel="noopener noreferrer" target="_blank">Buka PDF</a>'+
 '<a id="downloadPDF" class="button light" rel="noopener noreferrer" target="_blank">'+
 (isLocal?"Muat turun PDF":"Buka / muat turun PDF")+'</a></div><p class="muted" id="readerHint"></p><iframe class="reader" id="pdfFrame" title="Pembaca buku PDF"></iframe>';
 $("#openPDF",holder).href=src;
 const download=$("#downloadPDF",holder);download.href=src;
 if(isLocal)download.download=filename||"buku.pdf";
 $("#readerHint",holder).textContent=isLocal?
  "Fail ini disimpan pada pelayar/peranti anda, bukan diterbitkan kepada pengguna lain.":
  "Sesetengah pelayan PDF tidak membenarkan pratonton dalam iframe. Gunakan Buka PDF untuk melihat fail di tab baharu.";
 $("#pdfFrame",holder).src=src;
}
async function renderBook(book,view,turn){
 const localCloud=localStorage.getItem(linkKey(book.id))||book.pdfUrl||"";
 view.innerHTML='<h3 class="sectionTitle">Buku digital · '+escapeHTML(book.short)+'</h3>'+
 '<p class="muted">Baca PDF terus dalam pelayar atau muat turun fail yang telah anda import. Hanya terbitkan buku kepada umum jika ada hak/kebenaran.</p>'+
 '<div class="uploadbox"><label for="pdfFile">Import PDF buku ini dari peranti</label>'+
 '<input type="file" id="pdfFile" accept=".pdf,application/pdf"><p class="muted">Fail akan disimpan dalam pelayar ini menggunakan IndexedDB jika disokong. Tidak dimuat naik ke pelayan.</p>'+
 '<div id="pdfFileStatus" class="muted" role="status"></div><div class="actions"><button id="removePDF" type="button" class="button light">Buang PDF tersimpan</button></div></div>'+
 '<details style="margin:18px 0"><summary style="cursor:pointer;font-weight:750;font-size:13px">Gunakan pautan PDF awan (pilihan)</summary>'+
 '<label class="muted" for="pdfURL">Alamat HTTPS ke fail PDF yang dibenarkan dikongsi</label>'+
 '<input class="urlfield" id="pdfURL" type="url" placeholder="https://contoh.com/buku.pdf" value="'+escapeHTML(localCloud)+'">'+
 '<div class="actions"><button class="button" id="savePDFURL" type="button">Simpan pautan untuk peranti ini</button>'+
 '<button class="button light" id="clearPDFURL" type="button">Kosongkan pautan</button></div>'+
 '<p class="muted">Pautan yang disimpan di sini tidak muncul secara automatik kepada semua pelawat. Pemilik laman boleh menetapkan pdfUrl dalam assets/data.js untuk pautan awam.</p></details>'+
 '<div id="readerHolder"></div>'+sourceFooter(book);
 const holder=$("#readerHolder",view),message=$("#pdfFileStatus",view);
 const cloud=validHTTPS(localCloud);
 if(cloud)showReader(holder,cloud,book.book,false);
 else showReader(holder,null);
 const local=await loadLocal(book.id);
 if(turn!==currentLoad||state.tab!==0||BOOKS[state.subject]!==book)return;
 if(local&&local.file){
  releasePDF();state.pdfFile=local.file;state.pdfObjectUrl=URL.createObjectURL(local.file);
  showReader(holder,state.pdfObjectUrl,local.name,true);message.textContent="PDF sedia dibaca: "+local.name;
 }else if(!cloud)message.textContent="Belum ada fail PDF tersimpan pada peranti ini.";
 $("#pdfFile",view).onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf")){
   message.textContent="Fail tidak sah. Sila pilih PDF.";return;
  }
  releasePDF();state.pdfFile=file;state.pdfObjectUrl=URL.createObjectURL(file);
  showReader(holder,state.pdfObjectUrl,file.name,true);
  message.textContent="Menyimpan PDF…";
  try{await saveLocal(book.id,file);message.textContent="PDF tersimpan pada pelayar ini: "+file.name}
  catch(err){message.textContent="PDF boleh dibaca dalam sesi ini, tetapi penyimpanan kekal tidak tersedia."}
 };
 $("#removePDF",view).onclick=async()=>{
  await removeLocal(book.id);releasePDF();showReader(holder,cloud,book.book,false);message.textContent="PDF setempat telah dibuang.";
 };
 $("#savePDFURL",view).onclick=()=>{
  const raw=$("#pdfURL",view).value.trim();const url=validHTTPS(raw);
  if(raw&&!url){message.textContent="Masukkan pautan HTTPS yang sah.";return}
  if(url)localStorage.setItem(linkKey(book.id),url);else localStorage.removeItem(linkKey(book.id));
  if(!state.pdfFile)showReader(holder,url,book.book,false);
  message.textContent=url?"Pautan awan disimpan pada peranti ini.":"Pautan dikosongkan.";
 };
 $("#clearPDFURL",view).onclick=()=>{
  localStorage.removeItem(linkKey(book.id));$("#pdfURL",view).value="";
  if(!state.pdfFile)showReader(holder,validHTTPS(book.pdfUrl||""),book.book,false);
  message.textContent="Pautan peranti dikosongkan.";
 };
}
function start(){
 if(!BOOKS.length){document.body.innerHTML="<p>Data mata pelajaran tidak tersedia.</p>";return}
 const categories=["Semua",...new Set(BOOKS.map(book=>book.group))];
 $("#categoryFilter").innerHTML=categories.map(x=>'<option value="'+escapeHTML(x)+'">'+escapeHTML(x)+'</option>').join("");
 $("#searchBooks").addEventListener("input",renderSubjectNav);
 $("#categoryFilter").addEventListener("change",renderSubjectNav);
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
