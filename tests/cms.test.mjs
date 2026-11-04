import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createSign} from 'node:crypto';
import {CMS_PATH,validatePage,safeLink,renderCmsBlocks,applyCmsToHub} from '../lib/cms-core.mjs';
import {cmsOwnerAuthorized} from '../lib/cms-auth.mjs';
const page={path:'/',title:'Belajar AI',description:'Website pendidikan',blocks:[{id:'a1',type:'hero',title:'Belajar <AI>',text:'Selamat datang',label:'Mula',href:'/belajar',image:'',alt:''}]};
test('CMS validates structured content',()=>{assert.equal(validatePage(page).path,'/');assert(CMS_PATH.test('/belajar/contoh'));assert(!CMS_PATH.test('/api/editor'));});
test('CMS rejects dangerous links, duplicate block IDs and oversized pages',()=>{
 assert.equal(safeLink('javascript:alert(1)'),'');
 assert.throws(()=>validatePage({...page,blocks:[{...page.blocks[0],href:'javascript:alert(1)'}]}));
 assert.throws(()=>validatePage({...page,blocks:[page.blocks[0],page.blocks[0]]}));
 assert.throws(()=>validatePage({...page,path:'/admin.html'}));
});
test('CMS escapes text and keeps external links safe',()=>{
 const rendered=renderCmsBlocks({...page,blocks:[{...page.blocks[0],title:'<script>alert(1)</script>',href:'https://example.com'}]});
 assert(!rendered.includes('<script>'));
 assert(rendered.includes('&lt;script&gt;'));
 assert(rendered.includes('rel="noopener noreferrer"'));
});
test('CMS replaces only hub main content and title',()=>{
 const html='<html><head><title>Old</title><meta name="description" content="Old description"></head><body><header>KEEP</header><main id="content" tabindex="-1">OLD</main><footer>KEEP FOOTER</footer></body></html>';
 const result=applyCmsToHub(html,page);
 assert(result.includes('KEEP FOOTER'));assert(result.includes('<title>Belajar AI'));assert(!result.includes('>OLD</main>'));assert(result.includes('/cms.css'));
});
test('CMS authentication rejects missing signed assertions',async()=>{
 assert.equal(await cmsOwnerAuthorized(new Request('https://example.com'),{}),false);
 const request=new Request('https://example.com',{headers:{'Cf-Access-Jwt-Assertion':'not.a.valid.signature'}});
 assert.equal(await cmsOwnerAuthorized(request,{CF_ACCESS_AUD:'a'.repeat(32),CF_ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',CMS_OWNER_EMAIL:'owner@example.com'}),false);
});
test('CMS authentication verifies RS256 signature, issuer, audience and owner',async()=>{
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk=publicKey.export({format:'jwk'});jwk.kid='test-key';jwk.use='sig';
 const vars={CF_ACCESS_AUD:'a'.repeat(32),CF_ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',CMS_OWNER_EMAIL:'owner@example.com'};
 const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const header=b64({alg:'RS256',kid:'test-key'});
 const tokenFor=claims=>{const message=header+'.'+b64(claims);return message+'.'+createSign('RSA-SHA256').update(message).end().sign(privateKey).toString('base64url');};
 const now=Math.floor(Date.now()/1000);
 const claims={iss:'https://team.cloudflareaccess.com',aud:vars.CF_ACCESS_AUD,email:'owner@example.com',exp:now+200,iat:now-1};
 const fetchMock=async()=>new Response(JSON.stringify({keys:[jwk]}),{status:200});
 assert.equal(await cmsOwnerAuthorized(new Request('https://example.com',{headers:{'Cf-Access-Jwt-Assertion':tokenFor(claims)}}),vars,fetchMock),true);
 assert.equal(await cmsOwnerAuthorized(new Request('https://example.com',{headers:{'Cf-Access-Jwt-Assertion':tokenFor({...claims,email:'attacker@example.com'})}}),vars,fetchMock),false);
 assert.equal(await cmsOwnerAuthorized(new Request('https://example.com',{headers:{'Cf-Access-Jwt-Assertion':tokenFor({...claims,exp:now-1})}}),vars,fetchMock),false);
});

import {detectImageMime,MAX_MEDIA_BYTES} from '../lib/cms-media.mjs';
test('CMS media validates binary signatures, not MIME text alone',()=>{
 const png=Uint8Array.from([137,80,78,71,13,10,26,10,0]);
 const jpg=Uint8Array.from([255,216,255,0]);
 const webp=Uint8Array.from([82,73,70,70,0,0,0,0,87,69,66,80]);
 assert.equal(detectImageMime(png),'image/png');
 assert.equal(detectImageMime(jpg),'image/jpeg');
 assert.equal(detectImageMime(webp),'image/webp');
 assert.equal(detectImageMime(new TextEncoder().encode('<svg onload=alert(1)>')),null);
 assert.equal(MAX_MEDIA_BYTES,750000);
});
