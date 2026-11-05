// Verifies Cloudflare Access RS256 assertions at the origin. Never trust unsigned email headers.
function decode(segment){const fixed=segment.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(fixed+'='.repeat((4-fixed.length%4)%4)),c=>c.charCodeAt(0));}
function json(bytes){return JSON.parse(new TextDecoder().decode(bytes));}
export async function cmsOwnerAuthorized(request,vars,fetchImpl=fetch){
 try{
  const team=String(vars?.CF_ACCESS_TEAM_DOMAIN??'').trim().toLowerCase();
  const aud=String(vars?.CF_ACCESS_AUD??'').trim();
  const owner=String(vars?.CMS_OWNER_EMAIL??'').trim().toLowerCase();
  if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team)||!/^[a-z0-9]{32,64}$/i.test(aud)||!owner.includes('@'))return false;
  const token=request.headers.get('Cf-Access-Jwt-Assertion')||'';
  if(token.length<100||token.length>12000)return false;
  const parts=token.split('.');
  if(parts.length!==3||parts.some(part=>!/^[A-Za-z0-9_-]+$/.test(part)))return false;
  const header=json(decode(parts[0])), claims=json(decode(parts[1]));
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200)return false;
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!=='https://'+team || ![claims.aud].flat().includes(aud) ||
     !Number.isFinite(claims.exp)||claims.exp<=now||claims.exp>now+86400||
     (claims.nbf!==undefined&&claims.nbf>now+60)||
     (claims.iat!==undefined&&claims.iat>now+60)||
     String(claims.email||'').toLowerCase()!==owner)return false;
  const res=await fetchImpl('https://'+team+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(7000),redirect:'error'});
  if(!res.ok)return false;
  const data=await res.json();
  const jwk=(data.keys||[]).find(x=>x.kid===header.kid&&x.kty==='RSA'&&x.use!=='enc');
  if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signed=new TextEncoder().encode(parts[0]+'.'+parts[1]);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),signed);
 }catch{return false;}
}
