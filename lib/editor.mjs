export const initial=()=>({overrides:{},settings:{},deleted:[]});
export function validate(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||!x.overrides||!x.settings||!Array.isArray(x.deleted))throw Error('Format kandungan tidak sah.');
 if(Object.keys(x.overrides).length>5000||x.deleted.length>5000)throw Error('Terlalu banyak rekod.');
 const validId=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(s);
 for(const [id,p] of Object.entries(x.overrides)){
 if(!validId(id)||p.id!==id||!['draft','published'].includes(p.publishStatus)||!p.title?.trim()||!p.text?.trim()||!p.category?.trim())throw Error('Tajuk, kategori, teks dan status prompt diperlukan.');
 for(const [k,v] of Object.entries(p))if(typeof v==='string'&&v.length>24000)throw Error('Teks terlalu panjang.');
 }
 if(!x.deleted.every(validId))throw Error('ID tidak sah.');
 const s=x.settings;
 for(const key of ['acid','purple','pink','ink','paper'])if(s[key]&&!/^#[a-fA-F0-9]{6}$/.test(s[key]))throw Error('Warna tidak sah.');
 if(s.font&&!['Space Grotesk','DM Sans','Arial','Georgia'].includes(s.font))throw Error('Fon tidak sah.');
 for(const key of ['title','description','kicker','imageAlt'])if(s[key]!==undefined&&(typeof s[key]!=='string'||s[key].length>2000))throw Error('Teks reka bentuk terlalu panjang.');
 if(s.image){let u;try{u=new URL(s.image)}catch{throw Error('Gunakan URL gambar HTTPS.')}if(u.protocol!=='https:')throw Error('Gunakan URL gambar HTTPS.');}
 const keys=['hero','marquee','toolkit','featured','steps','faq','cta'];
 if(s.order&&(!Array.isArray(s.order)||s.order.length!==7||new Set(s.order).size!==7||!s.order.every(k=>keys.includes(k))))throw Error('Susunan seksyen tidak sah.');
 if(s.hidden&&(!Array.isArray(s.hidden)||!s.hidden.every(k=>keys.includes(k))))throw Error('Seksyen tidak sah.');
 if(new TextEncoder().encode(JSON.stringify(x)).length>900000)throw Error('Had simpanan suntingan 900 KB dicapai. Eksport salinan dahulu.');
 return x;
}
export function merge(base,state){const o=state.overrides;const prompts=base.prompts.filter(p=>!state.deleted.includes(p.id)).map(p=>o[p.id]?.publishStatus==='published'?{...p,...o[p.id]}:(o[p.id]?.publishedPrevious||p));for(const [id,p]of Object.entries(o))if(!base.prompts.some(b=>b.id===id)&&(p.publishStatus==='published'||p.publishedPrevious)&&!state.deleted.includes(id))prompts.push(p.publishStatus==='published'?p:p.publishedPrevious);return {...base,prompts,categories:[...new Set(prompts.map(p=>p.category))].sort().map(name=>({name,count:prompts.filter(p=>p.category===name).length})),types:[...new Set(prompts.map(p=>p.type).filter(Boolean))].sort().map(name=>({name,count:prompts.filter(p=>p.type===name).length})),settings:state.settings};}
