import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const mock=new URL('./fixtures/mock-primary-domain.mjs',import.meta.url).href;
const sha='a'.repeat(40);
for(const [mode,exitCode,status] of [['blocked',1,'BLOCKED'],['ready',0,'PASS']]){
 test('primary-domain gate '+mode+' exits '+exitCode,()=>{
  const command=spawnSync(process.execPath,['--import',mock,'scripts/check-primary-domain.mjs'],{
   cwd:new URL('.',root),encoding:'utf8',env:{...process.env,GITHUB_SHA:sha,MOCK_DOMAIN_MODE:mode},timeout:15000
  });
  assert.equal(command.status,exitCode,command.stderr);
  const report=JSON.parse(command.stdout.trim().split('\n').at(-1));
  assert.equal(report.status,status);
  assert.equal(report.domain,'https://cannybrainy.com');
 });
}
