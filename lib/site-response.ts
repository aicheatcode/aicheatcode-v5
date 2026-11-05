import {home} from './home';
import {CMS_PATH,applyCmsToHub,validatePage} from './cms-core.mjs';
import {folderPages} from './folder-pages.generated.mjs';
import {renderHub,publicPaths,registry,esc} from './hub.mjs';
import base from '../public/data.json';
import curated from '../public/curated-prompts.json';
import index from '../public/prompt-catalog.json';
import {initial,merge} from './editor.mjs';
import '../public/catalog.js';
const canonicalOrigin='https://cannybrainy.com';
export const pageHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()','X-Frame-Options':'DENY','Cross-Origin-Opener-Policy':'same-origin','Content-Security-Policy-Report-Only':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"};
const titles:Record<string,[string,string]>={
 '/prompt':['Cari Prompt','Cari prompt BM dan Inggeris mengikut tugasan, kategori, konteks dan mod.'],
 '/bina':['Bina Prompt','Susun peranan, tugas, konteks dan format. Pembina ini tidak menjalankan model AI.'],
 '/panduan':['Panduan Prompt','Belajar memberi arahan dan konteks, kemudian semak fakta dan hasil.'],
 '/koleksi':['Koleksi Saya','Bookmark, versi peribadi dan draf disimpan pada pelayar dan domain ini.'],
 '/sumber-status':['Sumber & Status','Bezakan integriti data, asal penerbit dan keberkesanan prompt pada model AI.'],
 '/peta-laman':['Peta Laman','Home, Belajar, Prompt, Projek dan Tentang mempunyai tujuan berasingan.'],
 '/hubungi':['Hubungi','Sediakan draf maklum balas. Tiada penghantaran tanpa saluran yang disahkan.'],
 '/galeri':['Galeri eksperimen','Eksperimen visual asal AICHEATCODE dikekalkan.']};
export async function servePage(request:Request,db?:any){
 const u=new URL(request.url),path=u.pathname.replace(/\/$/,'')||'/';
 if(path==='/robots.txt')return new Response('User-agent: *\nDisallow: /api/\nDisallow: /admin.html\nDisallow: /studio.html\nDisallow: /koleksi\nDisallow: /bina\nDisallow: /tools/\nSitemap: https://cannybrainy.com/sitemap.xml\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
 if(path==='/sitemap.xml'){
  // Only canonical, indexable public pages; omit query variants and private tools.
  let published=[];if(db){try{const rows=await db.prepare('SELECT path FROM cms_pages WHERE published_json IS NOT NULL').all();published=(rows.results||[]).map((x:any)=>x.path).filter((p:string)=>CMS_PATH.test(p));}catch(e){console.warn('CMS sitemap not ready',e);}}
  const pages=[...new Set([...publicPaths,...Object.keys(folderPages),...published,'/prompt','/panduan','/sumber-status'])];
  const xml='<?xml version="1.0" encoding="UTF-8"?>'+
   '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
   pages.map(p=>'<url><loc>'+esc(canonicalOrigin+p)+'</loc></url>').join('')+'</urlset>';
  return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
 }
 let cmsDoc=null;
 if(db&&CMS_PATH.test(path)&&!u.searchParams.has('legacy')&&u.searchParams.get('lang')!=='en'){
  try{const row=await db.prepare('SELECT published_json FROM cms_pages WHERE path=?').bind(path).first();
   if(row?.published_json)cmsDoc=validatePage(JSON.parse(row.published_json));
  }catch(e){console.error('CMS page unavailable; retaining baseline page',e);}
 }
 const editablePage=cmsDoc||(!u.searchParams.has('legacy')&&u.searchParams.get('lang')!=='en'?folderPages[path]:null);
 const hub=renderHub(u);
 if(hub&&!(path==='/'&&(u.searchParams.has('legacy')||u.hash))){
  return new Response(editablePage?applyCmsToHub(hub.html,editablePage):hub.html,{headers:pageHeaders});
 }
 if(!hub&&editablePage){
  const fallback=renderHub(new URL('/',u));
  if(fallback)return new Response(applyCmsToHub(fallback.html,editablePage),{headers:pageHeaders});
 }
 let m=titles[path],detail='',canonicalPath=path;
 if(path.startsWith('/prompt/')){
  const id=path.slice(8);if(id.startsWith('LOCAL-'))m=['Versi peribadi','Versi ini hanya tersedia pada pelayar yang menyimpannya.'];
  else{
   let state=initial();if(db){const row=await db.prepare("SELECT body FROM editor_state WHERE id='main'").first();if(row)state=JSON.parse(row.body);}
   const merged=merge({...base,prompts:[...base.prompts,...curated]},state);const Catalog=(globalThis as any).PromptCatalog,c=new Catalog(index,merged.prompts,state.deleted),p=c.getTask(id,u.searchParams.get('varian'));
   if(p){m=[p.title,p.text.slice(0,160)];detail='<p class="mono">'+esc(p.id)+'</p><pre>'+esc(p.text)+'</pre><p>Sumber: '+esc(p.source||'Belum disahkan')+'. Keberkesanan AI: '+esc(p.testStatus||'NOT TESTED')+'.</p>';canonicalPath='/prompt/'+c.taskId(p);}else return new Response('Not Found',{status:404,headers:{...pageHeaders,'Content-Type':'text/plain; charset=utf-8'}});
  }
 }else if(path.startsWith('/panduan/'))m=['Panduan '+path.slice(9),'Panduan penggunaan prompt. JavaScript memaparkan kandungan penuh panduan ini.'];
 if(path==='/')m=['Eksperimen visual asal','Playground asal dan fungsi sedia ada dikekalkan.'];
 if(!m)return new Response('<!doctype html><html lang="ms"><meta charset="utf-8"><meta name="robots" content="noindex"><title>404 — AICHEATCODE</title><main><h1>Halaman tidak ditemui</h1><p><a href="/">Kembali ke Home</a> · <a href="/belajar">Belajar</a> · <a href="/prompt">Cari Prompt</a></p></main></html>',{status:404,headers:pageHeaders});
 let html=home.replace(/<title>[\s\S]*?<\/title>/,'<title>'+esc(m[0])+' — AICHEATCODE</title>').replace(/<meta name="description"[^>]*>/,'<meta name="description" content="'+esc(m[1])+'">');
 const noindex=['/bina','/koleksi','/'].includes(path)||u.searchParams.size>0||path.includes('LOCAL-');
 html=html.replace('</head>','<link rel="canonical" href="'+canonicalOrigin+canonicalPath+'"><meta name="robots" content="'+(noindex?'noindex,follow':'index,follow')+'"><meta property="og:title" content="'+esc(m[0])+' — AICHEATCODE"><meta property="og:description" content="'+esc(m[1])+'"><meta property="og:url" content="'+canonicalOrigin+canonicalPath+'"><link rel="stylesheet" href="/prompt-brand.css?v=5"></head>');
 html=html.replace('<main id="main" tabindex="-1"></main>','<main id="main" tabindex="-1"><section class="wrap page-body"><h1>'+esc(m[0])+'</h1><p>'+esc(m[1])+'</p>'+detail+'<noscript><p>JavaScript diperlukan untuk carian, input, koleksi dan pembina.</p></noscript></section></main>');
 return new Response(html,{headers:pageHeaders});
}
