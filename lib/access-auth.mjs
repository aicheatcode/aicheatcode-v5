// Verify Cloudflare Access JWT signatures at the origin. Never trust identity headers alone.
const encoder=new TextEncoder();
const certCache=new Map();
function from64(value){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid base64url');
 const binary=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
function json64(value){return JSON.parse(new TextDecoder().decode(from64(value)));}
function getToken(request){
 const fromHeader=request.headers.get('cf-access-jwt-assertion');
 if(fromHeader)return fromHeader;
 const cookie=request.headers.get('cookie')||'';
 const match=cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
 return match?.[1]||null;
}
export async function authorizeOwner(request,env,{fetchImpl=fetch,now=Date.now(),subtle=crypto.subtle}={}){
 try{
  const team=String(env.CF_ACCESS_TEAM_DOMAIN||'').toLowerCase().trim()
    .replace(/^https:\/\//,'').replace(/\/$/,'');
  const aud=String(env.CF_ACCESS_AUD||'').trim();
  const owners=String(env.OWNER_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team)||!/^[a-zA-Z0-9]{20,128}$/.test(aud)||!owners.length)return null;
  const jwt=getToken(request);if(!jwt||jwt.length>10000)return null;
  const parts=jwt.split('.');if(parts.length!==3)return null;
  const header=json64(parts[0]),claims=json64(parts[1]);
  if(header.alg!=='RS256'||typeof header.kid!=='string')return null;
  if(claims.iss!=='https://'+team||!(Array.isArray(claims.aud)?claims.aud.includes(aud):claims.aud===aud))return null;
  const seconds=Math.floor(now/1000);
  if(!Number.isInteger(claims.exp)||claims.exp<=seconds||!Number.isInteger(claims.iat)||claims.iat>seconds+60||(claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>seconds+60)))return null;
  const email=typeof claims.email==='string'?claims.email.trim().toLowerCase():'';
  if(!owners.includes(email)||!claims.sub||typeof claims.sub!=='string')return null;
  const url='https://'+team+'/cdn-cgi/access/certs';
  let cached=certCache.get(url);
  if(!cached||cached.expires<now){
   const response=await fetchImpl(url,{headers:{Accept:'application/json'}});
   if(!response.ok)return null;
   const data=await response.json();
   if(!Array.isArray(data.keys))return null;
   cached={keys:data.keys,expires:now+10*60*1000};certCache.set(url,cached);
  }
  const jwk=cached.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&k.n&&k.e);
  if(!jwk)return null;
  const key=await subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await subtle.verify('RSASSA-PKCS1-v1_5',key,from64(parts[2]),encoder.encode(parts[0]+'.'+parts[1])))return null;
  return {email,subject:claims.sub};
 }catch{return null;}
}
