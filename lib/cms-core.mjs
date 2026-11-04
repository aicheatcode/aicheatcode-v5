// Public CMS validation and rendering. No raw HTML is accepted from editors.
export const CMS_PATH = /^(?:\/|\/belajar(?:\/[a-z0-9-]+)?|\/projek(?:\/[a-z0-9-]+)?|\/tentang)$/;
export const BLOCK_TYPES = ['hero','text','image','cards','cta'];
export const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeLink(input) {
 const value=String(input??'').trim();
 if(value.startsWith('/') && !value.startsWith('//') && !/[\u0000-\u001f]/.test(value))return value;
 try{const u=new URL(value);if(u.protocol==='https:' && !u.username && !u.password)return u.href;}catch{}
 return '';
}
const text=(x,limit)=>typeof x==='string'&&x.length<=limit;
export function validatePage(raw) {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Dokumen tidak sah.');
 const {path,title,description,blocks}=raw;
 if(!CMS_PATH.test(path??''))throw Error('Laluan halaman tidak dibenarkan.');
 if(!text(title,180)||!title.trim()||!text(description,600))throw Error('Tajuk atau penerangan tidak sah.');
 if(!Array.isArray(blocks)||blocks.length>40)throw Error('Maksimum 40 seksyen.');
 const ids=new Set();
 for(const b of blocks){
  if(!b||typeof b!=='object'||Array.isArray(b)||!BLOCK_TYPES.includes(b.type)||!text(b.id,64)||!/^[a-zA-Z0-9_-]{1,64}$/.test(b.id)||ids.has(b.id))throw Error('Jenis atau ID seksyen tidak sah.');
  ids.add(b.id);
  for(const k of ['title','text','label','alt'])if(b[k]!==undefined&&!text(b[k],12000))throw Error('Teks seksyen melebihi had.');
  if(b.href && !safeLink(b.href))throw Error('Pautan tidak selamat.');
  if(b.image && !safeLink(b.image))throw Error('URL gambar tidak selamat.');
  if(b.items!==undefined){
   if(!Array.isArray(b.items)||b.items.length>24)throw Error('Maksimum 24 kad bagi satu seksyen.');
   for(const c of b.items)if(!c||!text(c.title,180)||!text(c.text,2000)||!safeLink(c.href))throw Error('Kad atau pautan tidak sah.');
  }
 }
 if(new TextEncoder().encode(JSON.stringify(raw)).byteLength>200000)throw Error('Saiz dokumen melebihi 200 KB.');
 return {path,title,description,blocks:blocks.map(b=>({id:b.id,type:b.type,title:b.title||'',text:b.text||'',label:b.label||'',href:b.href||'',image:b.image||'',alt:b.alt||'',items:b.items||[]}))};
}
function link(url,label,cls){const dest=safeLink(url);return dest?'<a class="'+cls+'" href="'+esc(dest)+'"'+(dest.startsWith('https://')?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(label)+'</a>':'';}
function paragraph(value){return esc(value).replace(/\n/g,'<br>');}
export function renderCmsBlocks(raw){
 const doc=validatePage(raw);
 const content=doc.blocks.map(b=>{
  if(b.type==='hero')return '<section class="cms-section cms-hero"><div><p class="cms-eyebrow">AICHEATCODE / DIGITAL LEARNING</p><h1>'+esc(b.title)+'</h1><p>'+paragraph(b.text)+'</p>'+link(b.href,b.label||'Terokai →','cms-button')+'</div>'+(b.image?'<img src="'+esc(safeLink(b.image))+'" alt="'+esc(b.alt)+'" loading="eager">':'')+'</section>';
  if(b.type==='text')return '<section class="cms-section cms-copy"><h2>'+esc(b.title)+'</h2><p>'+paragraph(b.text)+'</p></section>';
  if(b.type==='image')return '<section class="cms-section cms-image"><figure><img src="'+esc(safeLink(b.image))+'" alt="'+esc(b.alt)+'" loading="lazy" decoding="async"><figcaption>'+esc(b.text)+'</figcaption></figure></section>';
  if(b.type==='cta')return '<section class="cms-section cms-cta"><h2>'+esc(b.title)+'</h2><p>'+paragraph(b.text)+'</p>'+link(b.href,b.label||'Buka →','cms-button')+'</section>';
  return '<section class="cms-section cms-cards"><h2>'+esc(b.title)+'</h2><p>'+paragraph(b.text)+'</p><div class="cms-card-grid">'+b.items.map(c=>'<article class="cms-card"><h3>'+esc(c.title)+'</h3><p>'+esc(c.text)+'</p>'+link(c.href,'Lihat →','cms-link')+'</article>').join('')+'</div></section>';
 }).join('');
 return '<div class="cms-page">'+content+'</div>';
}
export function applyCmsToHub(html,raw){
 const doc=validatePage(raw);
 const open='<main id="content" tabindex="-1">';
 const start=html.indexOf(open),end=html.indexOf('</main>',start);
 if(start<0||end<0)throw Error('Templat halaman tidak sepadan.');
 let updated=html.slice(0,start)+open+renderCmsBlocks(doc)+html.slice(end);
 updated=updated.replace(/<title>[^<]*<\/title>/,'<title>'+esc(doc.title)+' — AICHEATCODE</title>');
 updated=updated.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+esc(doc.description)+'">');
 updated=updated.replace('</head>','<link rel="stylesheet" href="/cms.css?v=1"></head>');
 return updated;
}
