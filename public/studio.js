'use strict';
// No-code editorial CMS. Text is inserted with textContent, never as raw HTML.
const $=id=>document.getElementById(id);
let pages=new Map(),selected=null,doc=null,revision=0,dirty=false,saving=false;
const labels={hero:'Hero / tajuk utama',text:'Teks editorial',image:'Gambar',cards:'Kad / projek',cta:'Seruan tindakan'};
const defaults={
 '/':{title:'Belajar AI. Cipta lebih.',description:'Pendidikan AI, Canva dan kemahiran digital percuma untuk pemula.',blocks:[
 {type:'hero',title:'LEARN AI. CREATE MORE.',text:'Belajar AI dan kemahiran digital secara percuma. Terokai tutorial, cuba prompt dan bina projek sebenar.',label:'Mula belajar →',href:'/belajar'},
 {type:'cards',title:'Empat bidang. Satu tempat belajar.',text:'Mulakan dengan perkara yang paling anda perlukan.',items:[
 {title:'AI Prompt',text:'Arahan yang boleh diuji dan disemak.',href:'/belajar/prompt-pertama'},
 {title:'Canva Tutorial',text:'Reka bentuk praktikal dan mudah dibaca.',href:'/belajar/poster-jelas'},
 {title:'Creative AI',text:'Daripada idea kepada brief visual.',href:'/belajar/brief-visual'},
 {title:'Brand Studio',text:'Bina jenama yang jelas dan konsisten.',href:'/belajar/semakan-jenama'}]},
 {type:'cta',title:'Cuba sendiri. Semak hasil.',text:'Gunakan alat pembelajaran dan projek sebenar.',label:'Terokai projek →',href:'/projek'}]},
 '/belajar':{title:'Belajar kemahiran digital',description:'Tutorial praktikal AI, Canva, kreatif dan jenama.',blocks:[{type:'hero',title:'SATU KEMAHIRAN. SATU AKTIVITI.',text:'Pilih bidang dan mula dengan latihan praktikal.'},{type:'cards',title:'Pilih tutorial anda',items:[{title:'AI Prompt',text:'Prompt pertama',href:'/belajar/prompt-pertama'},{title:'Canva Tutorial',text:'Poster jelas',href:'/belajar/poster-jelas'},{title:'Creative AI',text:'Brief visual',href:'/belajar/brief-visual'},{title:'Brand Studio',text:'Semakan jenama',href:'/belajar/semakan-jenama'}]}]},
 '/projek':{title:'Projek dan bukti',description:'Aplikasi yang boleh dicuba dan disemak.',blocks:[{type:'hero',title:'DIBINA. DIUJI. DITERANGKAN.',text:'Semak projek pendidikan dan eksperimen sebenar.'},{type:'cards',title:'Projek pilihan',items:[{title:'Prompt Playground',text:'Cari, bina dan sesuaikan prompt.',href:'/prompt'},{title:'Belajar Arab',text:'Aplikasi pembelajaran Bahasa Arab Tingkatan 1.',href:'/projek/belajar-arab'},{title:'Courses Free AI',text:'Direktori pembelajaran digital.',href:'/projek/courses-free-ai'}]}]},
 '/tentang':{title:'Tentang AICHEATCODE',description:'Misi menjadikan pendidikan digital boleh diakses ramai.',blocks:[{type:'hero',title:'ILMU DIGITAL UNTUK SEMUA.',text:'AICHEATCODE membantu pelajar, pendidik dan pemula menguasai kemahiran AI serta reka bentuk.'},{type:'text',title:'Misi pendidikan',text:'Menyediakan pembelajaran digital praktikal dan rendah halangan. Semak sumber, fakta dan hak penggunaan sebelum berkongsi.'}]}
};
function freshBlock(type){return {id:'sec-'+crypto.randomUUID().replace(/-/g,'').slice(0,12),type,title:'',text:'',label:'',href:'',image:'',alt:'',items:[]};}
function template(path){const t=defaults[path]||{title:'Halaman baharu',description:'',blocks:[{type:'hero',title:'Tajuk halaman',text:'Tulis pengenalan di sini.'}]};return {path,title:t.title,description:t.description,blocks:t.blocks.map(b=>Object.assign(freshBlock(b.type),structuredClone(b),{id:freshBlock(b.type).id}))};}
function state(message,error=false){$('status').textContent=message;$('status').className=error?'error':'';}
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function button(label,fn){const b=node('button','',label);b.type='button';b.onclick=fn;return b;}
function field(root,label,value,fn,options={}){
 const wrapper=node('label',options.wide?'wide':'');wrapper.append(document.createTextNode(label));
 const input=document.createElement(options.multi?'textarea':'input');if(options.multi)input.rows=options.rows||3;
 input.value=value||'';input.maxLength=options.max||12000;input.addEventListener('input',()=>{fn(input.value);dirty=true;preview();});wrapper.append(input);root.append(wrapper);return input;
}
function list(){
 const sel=$('pageSelect'),last=sel.value;sel.replaceChildren();
 const all=[...new Set([...Object.keys(defaults),...pages.keys()])].sort((a,b)=>a==='/'?-1:b==='/'?1:a.localeCompare(b));
 for(const path of all){const option=node('option','',path+(pages.get(path)?.published?' ✓':''));option.value=path;sel.append(option);}
 sel.value=selected||last||'/';
}
function load(path){
 if(dirty&&!confirm('Abaikan draf yang belum disimpan?'))return;
 selected=path;const saved=pages.get(path);
 doc=saved?structuredClone(saved.document):template(path);revision=saved?.revision||0;dirty=false;list();fields();state(saved?.published?'Halaman telah diterbitkan. Suntingan baharu masih draf.':'Draf disediakan. Belum terbit.');
}
function fields(){
 $('path').value=doc.path;$('title').value=doc.title;$('description').value=doc.description;
 $('revision').textContent='Versi '+revision;$('liveLink').href=doc.path;drawBlocks();preview();
}
function drawBlocks(){
 const root=$('blocks');root.replaceChildren();$('blockCount').textContent=doc.blocks.length+' seksyen';
 doc.blocks.forEach((b,i)=>{
  const wrap=node('section','block'),head=node('div','blockHead');
  head.append(node('h3','',labels[b.type]||b.type));
  const controls=node('div','blockActions');
  const up=button('↑',()=>move(i,-1));up.disabled=i===0;controls.append(up);
  const down=button('↓',()=>move(i,1));down.disabled=i===doc.blocks.length-1;controls.append(down);
  controls.append(button('Buang',()=>{if(confirm('Buang seksyen ini daripada draf?')){doc.blocks.splice(i,1);dirty=true;drawBlocks();preview();}}));
  head.append(controls);wrap.append(head);
  const grid=node('div','blockFields');
  if(b.type!=='image')field(grid,'Tajuk',b.title,v=>b.title=v,{max:180});
  if(b.type!=='image')field(grid,'Penerangan / teks',b.text,v=>b.text=v,{wide:true,multi:true});
  if(['hero','cta'].includes(b.type)){field(grid,'Teks pautan',b.label,v=>b.label=v);field(grid,'URL pautan',b.href,v=>b.href=v);}
  if(['hero','image'].includes(b.type)){
   field(grid,'URL gambar HTTPS atau aset /evidence/',b.image,v=>b.image=v,{wide:true});
   field(grid,'Keterangan gambar (alt)',b.alt,v=>b.alt=v,{wide:true});
   const imageLabel=node('label','wide','Muat naik gambar (PNG, JPG, WebP atau AVIF, maksimum 750 KB)');
   const picker=document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp,image/avif';
   picker.onchange=async()=>{const file=picker.files?.[0];if(!file)return;
    if(file.size>750000){state('Gambar melebihi 750 KB. Kecilkan dahulu.',true);return;}
    state('Memuat naik gambar ke storan D1…');picker.disabled=true;
    try{const body=new FormData();body.set('image',file);const response=await fetch('/api/cms-media',{method:'POST',body});const result=await response.json();if(!response.ok)throw Error(result.error||'Gagal memuat naik.');b.image=result.url;dirty=true;drawBlocks();preview();state('Gambar disimpan. Klik Simpan draf atau Terbitkan untuk gunakan gambar.');}
    catch(err){state(err.message||'Muat naik gagal.',true);picker.disabled=false;}
   };imageLabel.append(picker);grid.append(imageLabel);
  }
  if(b.type==='image')field(grid,'Kapsyen',b.text,v=>b.text=v,{wide:true,multi:true});
  wrap.append(grid);
  if(b.type==='cards'){
   b.items.forEach((item,j)=>{
    const card=node('div','cardRow');
    field(card,'Tajuk kad',item.title,v=>item.title=v);
    field(card,'Penerangan',item.text,v=>item.text=v,{multi:true});
    field(card,'Pautan',item.href,v=>item.href=v);
    card.append(button('Padam kad',()=>{b.items.splice(j,1);dirty=true;drawBlocks();preview();}));wrap.append(card);
   });
   const add=button('+ Tambah kad',()=>{if(b.items.length>=24)return state('Maksimum 24 kad.',true);b.items.push({title:'Kad baharu',text:'',href:'/'});dirty=true;drawBlocks();preview();});wrap.append(add);
  }
  root.append(wrap);
 });
}
function move(i,dir){const j=i+dir;if(j<0||j>=doc.blocks.length)return;[doc.blocks[i],doc.blocks[j]]=[doc.blocks[j],doc.blocks[i]];dirty=true;drawBlocks();preview();}
function preview(){
 const root=$('previewBody');root.replaceChildren();
 root.append(node('small','',doc.path+' · '+doc.title));
 doc.blocks.forEach(b=>{
  const section=node('section','pv '+b.type);
  if(b.type!=='image')section.append(node('h2','',b.title));
  if(b.text)section.append(node('p','',b.text));
  if(b.image){const image=node('img');const u=b.image.trim();if(u.startsWith('/')&&!u.startsWith('//')||u.startsWith('https://')){image.src=u;image.alt=b.alt;section.append(image);}}
  if(['cta','hero'].includes(b.type)&&b.href){const a=node('a','',b.label||'Buka →');a.href=b.href;section.append(a);}
  if(b.type==='cards')for(const c of b.items){const row=node('div','pv');row.append(node('strong','',c.title),node('p','',c.text));section.append(row);}
  root.append(section);
 });
}
function exportFile(){
 const blob=new Blob([JSON.stringify({document:doc,revision},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='aicheatcode-'+doc.path.replace(/\W/g,'-')+'-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function save(action){
 if(saving)return;
 if(!doc.path.match(/^(\/|\/belajar(\/[a-z0-9-]+)?|\/projek(\/[a-z0-9-]+)?|\/tentang)$/)){state('Laluan hanya /, /belajar, /projek, /tentang dan subhalamannya.',true);return;}
 doc.title=$('title').value;doc.description=$('description').value;
 if(!doc.title.trim())return state('Tajuk wajib diisi.',true);
 if(action==='unpublish'&&!confirm('Nyahterbit halaman ini? Halaman asal akan kembali dipaparkan.'))return;
 saving=true;state('Menyimpan perubahan dalam D1…');
 try{
  const resp=await fetch('/api/site-cms',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:doc,revision,action})});
  const data=await resp.json();if(!resp.ok)throw Error(data.error||'Simpanan gagal');
  revision=data.revision;pages.set(doc.path,{path:doc.path,document:structuredClone(doc),published:action==='publish'?true:action==='unpublish'?false:(pages.get(doc.path)?.published||false),revision});
  dirty=false;list();fields();state(action==='publish'?'PASS — Halaman diterbitkan.':action==='unpublish'?'Halaman dinyahterbit.':'Draf disimpan. Halaman live tidak berubah.');
 }catch(e){state(e.message||'Simpanan gagal.',true);}finally{saving=false;}
}
$('title').addEventListener('input',e=>{doc.title=e.target.value;dirty=true;preview();});
$('description').addEventListener('input',e=>{doc.description=e.target.value;dirty=true;});
$('path').addEventListener('change',e=>{if(revision!==0){e.target.value=doc.path;return state('Laluan halaman terbitan tidak boleh diubah. Cipta halaman baharu.',true);}doc.path=e.target.value;dirty=true;preview();});
$('pageSelect').onchange=e=>load(e.target.value);
$('newPage').onclick=()=>{const p=prompt('Laluan baharu (contoh: /projek/projek-baharu)');if(!p)return;load(p);doc.path=p;fields();dirty=true;};
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{if(doc.blocks.length>=40)return state('Maksimum 40 seksyen.',true);doc.blocks.push(freshBlock(b.dataset.add));dirty=true;drawBlocks();preview();});
$('save').onclick=()=>save('save');$('publish').onclick=()=>save('publish');$('unpublish').onclick=()=>save('unpublish');$('export').onclick=exportFile;
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
(async()=>{
 try{
  const r=await fetch('/api/site-cms',{cache:'no-store'}),data=await r.json();
  if(!r.ok)throw Error((data.error||'Akses pemilik disekat.')+' Pastikan Cloudflare Access dikonfigurasi untuk akaun pemilik.');
  for(const p of data.pages||[])pages.set(p.path,p);
  $('workspace').hidden=false;selected='/';load('/');
 }catch(e){state(e.message||'Gagal mengesahkan akaun pemilik.',true);}
})();