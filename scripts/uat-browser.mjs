// Optional browser UAT: requires Playwright + Chromium installed separately.
// No credentials or Access cookies are saved in screenshots or console output.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const url=process.env.UAT_ORIGIN||'https://aicheatcode-v5.aicheatcode-e4364da72f75.workers.dev';
assert(/^https:\/\//.test(url),'Use HTTPS for browser UAT');
let chromium;
try{({chromium}=await import('playwright'));}catch{throw Error('Install Playwright in the test environment; browser UAT NOT TESTED');}
const browser=await chromium.launch({headless:true});
const outputs=[];
const pages=[
 {name:'desktop-chrome',viewport:{width:1440,height:900}},
 {name:'mobile-chrome',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
mkdirSync(resolve('uat-evidence'),{recursive:true});
try{
 for(const config of pages){
  const context=await browser.newContext({viewport:config.viewport,isMobile:!!config.isMobile,hasTouch:!!config.hasTouch,ignoreHTTPSErrors:false});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response?.status(),200,'Home request failed');
  await page.locator('body').waitFor({state:'visible'});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(overflow,false,'Horizontal overflow in '+config.name);
  const hero=await page.locator('h1').count();
  assert(hero>0,'Main heading absent');
  await page.screenshot({path:resolve('uat-evidence',config.name+'-home.png'),fullPage:true});
  // Login must not be bypassable. Cloudflare Access may redirect (302) or origin may return 403.
  const editor=await page.request.get(url+'/api/site-cms',{maxRedirects:0});
  assert([302,303,307,308,401,403].includes(editor.status()),'Anonymous CMS unexpectedly accessible');
  assert.equal(errors.length,0,'Browser runtime exception: '+errors.join('; '));
  outputs.push({viewport:config.name,home:response.status(),noOverflow:true,anonymousCms:editor.status(),status:'PASS'});
  await context.close();
 }
 console.log(JSON.stringify({status:'PASS',results:outputs},null,2));
}catch(e){console.error('FAIL UAT: '+e.message);process.exitCode=1;}finally{await browser.close();}
