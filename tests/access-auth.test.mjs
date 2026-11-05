import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {authorizeOwner} from '../lib/access-auth.mjs';
const env={CF_ACCESS_TEAM_DOMAIN:'test-cms.cloudflareaccess.com',CF_ACCESS_AUD:'a'.repeat(32),OWNER_EMAILS:'owner@example.test'};
function b64(x){return Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url');}
test('signed Access JWT requires signature, issuer, audience and owner allowlist',async()=>{
 const keys=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await webcrypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='cms-test-key';
 const fetchImpl=async()=>Response.json({keys:[jwk]});
 const now=1700000000000;
 const claims={iss:'https://'+env.CF_ACCESS_TEAM_DOMAIN,aud:[env.CF_ACCESS_AUD],sub:'owner-1',email:'owner@example.test',iat:Math.floor(now/1000)-60,exp:Math.floor(now/1000)+300};
 async function jwt(payload=claims){
  const text=b64({alg:'RS256',kid:jwk.kid})+'.'+b64(payload);
  const signature=await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(text));
  return text+'.'+Buffer.from(signature).toString('base64url');
 }
 const request=token=>new Request('https://cannybrainy.com/api/site-cms',{headers:{'cf-access-jwt-assertion':token}});
 const options={fetchImpl,now,subtle:webcrypto.subtle};
 const token=await jwt();
 assert.deepEqual(await authorizeOwner(request(token),env,options),{email:'owner@example.test',subject:'owner-1'});
 assert.equal(await authorizeOwner(request(token+'A'),env,options),null);
 assert.equal(await authorizeOwner(request(await jwt({...claims,email:'attacker@example.test'})),env,options),null);
 assert.equal(await authorizeOwner(request(await jwt({...claims,aud:['other-app']})),env,options),null);
 assert.equal(await authorizeOwner(request(await jwt({...claims,exp:Math.floor(now/1000)-1})),env,options),null);
 assert.equal(await authorizeOwner(request(token),{...env,OWNER_EMAILS:''},options),null);
});
