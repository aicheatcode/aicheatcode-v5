// Actual local Worker + D1 HTTP verification. No Cloudflare credentials required.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareConfig } from './deploy-cloudflare.mjs';
import { smokeProduction } from './cloudflare-smoke.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = mkdtempSync(join(tmpdir(), 'aicheatcode-d1-http-'));
const commit = process.env.GITHUB_SHA || 'a'.repeat(40);
const config = join(root, 'dist/server/wrangler.test.json');
const environment = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1' };
delete environment.CLOUDFLARE_API_TOKEN;
delete environment.CLOUDFLARE_ACCOUNT_ID;
let worker, logs = '';
function command(args) {
  const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), ...args], { cwd: root, env: environment, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 60000 });
  assert.equal(result.status, 0, (result.stderr || result.stdout || String(result.error)).slice(-5000));
}
try {
  const generated = prepareConfig({ root, accountId: 'a'.repeat(32), database: { id: '11111111-1111-4111-8111-111111111111', name: 'local-test-only' }, workerName: 'aicheatcode-local-test', commit });
  renameSync(generated, config);
  const seed = spawnSync('python3', [join(root, 'scripts/prepare-d1-seed.py'), '--output', temporary], { encoding: 'utf8' });
  assert.equal(seed.status, 0, seed.stderr);
  command(['d1', 'migrations', 'apply', 'DB', '--local', '--config', config, '--persist-to', join(temporary, 'state')]);
  command(['d1', 'execute', 'DB', '--local', '--config', config, '--persist-to', join(temporary, 'state'), '--file', join(temporary, 'seed.sql')]);
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  worker = spawn(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'dev', '--config', config, '--local', '--persist-to', join(temporary, 'state'), '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '0'], { cwd: root, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [worker.stdout, worker.stderr]) stream.on('data', data => { logs = (logs + data).slice(-20000); });
  const manifest = JSON.parse(readFileSync(join(temporary, 'seed-manifest.json')));
  const result = await smokeProduction({ url: `http://127.0.0.1:${port}`, commit, firstPromptId: manifest.ids[0], allowLocal: true, attempts: 40, delayMs: 250 });
  console.log(JSON.stringify({ scope: 'LOCAL WORKER + D1', ...result }, null, 2));
} catch (error) {
  console.error(logs.slice(-5000));
  throw error;
} finally {
  if (worker && worker.exitCode === null) {
    worker.kill('SIGTERM');
    await Promise.race([new Promise(resolve => worker.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 3000))]);
    if (worker.exitCode === null) worker.kill('SIGKILL');
  }
  rmSync(config, { force: true });
  rmSync(temporary, { recursive: true, force: true });
}
