const slugPattern=/^(home|belajar|projek|tentang)$/;
const sectionsAllowed=new Set(['text','tutorial','project','image','prompt']);
export function validatePage(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Kandungan halaman tidak sah.');
 const {slug,title,description='',imageUrl=null,sections=[],published=false}=input;
 if(typeof slug!=='string'||!slugPattern.test(slug))throw Error('Halaman tidak sah.');
 if(typeof title!=='string'||!title.trim()||title.length>140)throw Error('Tajuk diperlukan (maksimum 140 aksara).');
 if(typeof description!=='string'||description.length>2000)throw Error('Penerangan terlalu panjang.');
 if(typeof published!=='boolean')throw Error('Status penerbitan tidak sah.');
 if(imageUrl!==null&&imageUrl!==''){
  if(typeof imageUrl!=='string'||imageUrl.length>2048)throw Error('URL gambar tidak sah.');
  let url;try{url=new URL(imageUrl)}catch{throw Error('URL gambar tidak sah.')}
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Gambar mesti menggunakan URL HTTPS tanpa kelayakan.');
 }
 if(!Array.isArray(sections)||sections.length>40)throw Error('Maksimum 40 seksyen.');
 const ids=new Set();
 const clean=sections.map((s,i)=>{
  if(!s||typeof s!=='object'||Array.isArray(s)||!sectionsAllowed.has(s.type)||typeof s.id!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(s.id)||ids.has(s.id))throw Error('Jenis atau ID seksyen tidak sah.');
  ids.add(s.id);
  if(typeof s.title!=='string'||s.title.length>180||typeof s.body!=='string'||s.body.length>12000)throw Error('Teks seksyen tidak sah.');
  if(s.url!==undefined&&s.url!==null&&s.url!==''){
   let u;try{u=new URL(s.url)}catch{throw Error('Pautan seksyen tidak sah.')}
   if(u.protocol!=='https:'||u.username||u.password||String(s.url).length>2048)throw Error('Pautan seksyen mesti HTTPS.');
  }
  return {id:s.id,type:s.type,title:s.title,body:s.body,url:s.url||null,position:i};
 });
 const output={slug,title:title.trim(),description,imageUrl:imageUrl||null,sections:clean,published};
 if(new TextEncoder().encode(JSON.stringify(output)).length>250000)throw Error('Had halaman 250KB dicapai.');
 return output;
}
export function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function renderSections(sections){
 return sections.map(s=>{
  const url=safeLink(s.url);
  const visual=s.type==='image'&&url?'<img class="cms-section-image" src="'+escapeHTML(url)+'" alt="'+escapeHTML(s.title)+'" loading="lazy" width="1000" height="560">':'';
  const link=url?'<a href="'+escapeHTML(url)+'" target="_blank" rel="noopener noreferrer">Buka sumber ↗</a>':'';
  return '<section class="cms-section" data-cms-section="'+escapeHTML(s.id)+'"><p class="eyebrow">'+escapeHTML(s.type)+'</p><h2>'+escapeHTML(s.title)+'</h2>'+visual+'<p>'+escapeHTML(s.body)+'</p>'+link+'</section>';
 }).join('');
}
