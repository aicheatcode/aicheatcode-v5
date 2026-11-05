'use strict';
const $=id=>document.getElementById(id);
const types={text:'Teks',tutorial:'Tutorial',project:'Projek',image:'Imej',prompt:'Prompt'};
let revision=0,published=false,dirty=false,busy=false;
const status=(msg,error=false)=>{$('status').textContent=msg;$('status').dataset.error=String(error);};
const safeId=()=>{const b=crypto.getRandomValues(new Uint8Array(8));return 'section-'+Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');};
const fields=card=>({id:card.dataset.id,type:card.querySelector('[data-field=type]').value,title:card.querySelector('[data-field=title]').value,body:card.querySelector('[data-field=body]').value,url:card.querySelector('[data-field=url]').value});
function buildCard(s){
 const card=document.createElement('article');
 card.className='section-card';card.dataset.id=s.id;
 // Template is static. All untrusted values are assigned through .value below.
 card.innerHTML='<div class="sectionbar"><strong>Seksyen</strong><div><button class="move" type="button" data-command="up" aria-label="Alih naik">↑</button><button class="move" type="button" data-command="down" aria-label="Alih turun">↓</button><button class="remove" type="button" data-command="remove">Buang</button></div></div><label>Jenis kandungan<select data-field="type"><option value="text">Teks</option><option value="tutorial">Tutorial</option><option value="project">Projek</option><option value="image">Imej</option><option value="prompt">Prompt</option></select></label><label>Tajuk seksyen<input data-field="title" maxlength="180"></label><label>Kandungan<textarea data-field="body" rows="5" maxlength="12000"></textarea></label><label>Pautan sumber / gambar (HTTPS, pilihan)<input data-field="url" type="url" maxlength="2048" placeholder="https://…"></label>';
 for(const k of ['type','title','body','url'])card.querySelector('[data-field='+k+']').value=s[k]||'';
 card.addEventListener('click',e=>{
  const b=e.target.closest('[data-command]');if(!b)return;
  const parent=card.parentNode,cmd=b.dataset.command;
  if(cmd==='remove'){if(confirm('Buang seksyen ini daripada draf?')){card.remove();dirty=true;syncButtons();}}
  if(cmd==='up'&&card.previousElementSibling){parent.insertBefore(card,card.previousElementSibling);dirty=true;syncButtons();}
  if(cmd==='down'&&card.nextElementSibling){parent.insertBefore(card.nextElementSibling,card);dirty=true;syncButtons();}
 });
 $('sections').append(card);syncButtons();
}
function syncButtons(){
 const cards=[...$('sections').children];
 cards.forEach((c,i)=>{c.querySelector('[data-command=up]').disabled=i===0;c.querySelector('[data-command=down]').disabled=i===cards.length-1;});
}
function snapshot(){return {slug:$('page').value,title:$('title').value,description:$('description').value,imageUrl:$('image').value.trim()||null,published,sections:[...$('sections').children].map(fields)};}
function loadForm(page){
 $('title').value=page.title||'';$('description').value=page.description||'';$('image').value=page.imageUrl||'';
 $('sections').replaceChildren();(page.sections||[]).forEach(buildCard);dirty=false;
}
function showPublishState(){
 $('publication').textContent=published?'Diterbitkan':'Belum diterbitkan melalui CMS';
 $('publication').dataset.live=String(published);
 $('view').href=($('page').value==='home'?'/':'/'+$('page').value);
}
async function load(){
 status('Memuatkan kandungan pemilik…');$('workspace').hidden=true;
 try{
  const r=await fetch('/api/site-cms?slug='+encodeURIComponent($('page').value),{cache:'no-store',credentials:'same-origin'});
  const j=await r.json();if(!r.ok)throw Error(j.error||'Akses atau server tidak tersedia.');
  revision=j.revision;published=j.published;loadForm(j.page);showPublishState();$('workspace').hidden=false;
  status('Draf sedia untuk disunting · versi '+revision);
 }catch(e){status('Tidak dapat mengakses CMS: '+e.message+' Pastikan Cloudflare Access dan D1 telah dikonfigurasi.',true);}
}
async function submit(action){
 if(busy)return;
 if(action==='publish'&&!confirm('Terbitkan kandungan draf ini dan gantikan kandungan awam bagi halaman yang dipilih?'))return;
 if(action==='unpublish'&&!confirm('Nyahterbitkan versi CMS? Reka bentuk V5 asal akan digunakan sebagai fallback.'))return;
 busy=true;for(const b of document.querySelectorAll('.actions button'))b.disabled=true;status('Sedang menyimpan…');
 try{
  const r=await fetch('/api/site-cms',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,page:snapshot(),revision})});
  const j=await r.json();if(!r.ok)throw Error(j.error||'Gagal menyimpan.');
  revision=j.revision;if(typeof j.published==='boolean')published=j.published;
  dirty=false;showPublishState();
  status(action==='publish'?'Halaman diterbitkan · versi '+revision:action==='unpublish'?'Halaman dinyahterbit · versi '+revision:'Draf disimpan · versi '+revision);
 }catch(e){status('Gagal: '+e.message,true);}
 finally{busy=false;for(const b of document.querySelectorAll('.actions button'))b.disabled=false;}
}
$('add').addEventListener('click',()=>{buildCard({id:safeId(),type:'text',title:'',body:'',url:''});dirty=true;});
$('editor').addEventListener('input',()=>dirty=true);
$('editor').addEventListener('change',()=>dirty=true);
$('editor').addEventListener('submit',e=>{e.preventDefault();submit('save');});
$('publish').addEventListener('click',()=>submit('publish'));
$('unpublish').addEventListener('click',()=>submit('unpublish'));
let selectedPage=$('page').value;
$('page').addEventListener('change',()=>{
 if(dirty&&!confirm('Buang perubahan draf yang belum disimpan?')){$('page').value=selectedPage;return;}
 selectedPage=$('page').value;load();
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
load();
