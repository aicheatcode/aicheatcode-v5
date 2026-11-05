import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloudflareClient, normalizeApiToken, prepareConfig, resolveDatabase, resolveWorkersSubdomain } from '../scripts/deploy-cloudflare.mjs';
import { productionOrigin, smokeProduction } from '../scripts/cloudflare-smoke.mjs';

const accountId = 'a'.repeat(32);
const id = '11111111-1111-4111-8111-111111111111';
const name = 'aicheatcode-v5-production';
const commit = 'b'.repeat(40);
const reply = (result, status = 200) => Response.json({ success: status === 200, result, errors: status === 200 ? [] : [{ code: 10000 }] }, { status });

test('copied token formatting is normalized without executing pasted commands', () => {
  const token = 'test-only-cfat_token-value';
  for (const value of [token, ' ' + token + '\n', 'Bearer ' + token, '"' + token + '"', "'Bearer " + token + "'", 'Bearer "' + token + '"']) {
    assert.equal(normalizeApiToken(value), token);
  }
  const example = "curl https://api.cloudflare.com/client/v4/accounts/example/tokens/verify --header 'Authorization: Bearer " + token + "'";
  assert.equal(normalizeApiToken(example), token);
  assert.throws(() => normalizeApiToken(example + " --header 'Authorization: Bearer another-test-token'"), /ambiguous/);
  assert.throws(() => normalizeApiToken('AICHEATCODE GitHub'), /token value only/);
  assert.throws(() => new CloudflareClient({ accountId, token: accountId }), /contains the Account ID/);
});

test('authentication failure identifies the Secret to replace without exposing its value', async () => {
  const token = 'test-only-cfat_token-value';
  const client = new CloudflareClient({ accountId, token: 'Bearer ' + token, fetchImpl: async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer ' + token);
    return Response.json({ success: false, errors: [{ code: 9106 }] }, { status: 400 });
  } });
  await assert.rejects(client.request('/workers/subdomain'), error => /CLOUDFLARE_API_TOKEN/.test(error.message) && /9106/.test(error.message) && !error.message.includes(token));
});

test('existing D1 is reused without creating or overwriting a database', async () => {
  const calls = [];
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async (url, opts) => { calls.push(opts.method); assert(url.startsWith(`https://api.cloudflare.com/client/v4/accounts/${accountId}/`)); return reply([{ uuid: id, name }]); } });
  assert.deepEqual(await resolveDatabase(client, { name }), { id, name, created: false });
  assert.deepEqual(calls, ['GET']);
});

const missingSubdomain = () => Response.json({ success: false, errors: [{ code: 10007 }] }, { status: 404 });

test('existing Workers subdomain is retained with no account-level write', async () => {
  const calls = [];
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async (_url, options) => {
    calls.push(options.method); return reply({ subdomain: 'existing-account' });
  } });
  assert.deepEqual(await resolveWorkersSubdomain(client), { subdomain: 'existing-account', created: false });
  assert.deepEqual(calls, ['GET']);
});

test('missing Workers subdomain is registered once and read back using a stable name', async () => {
  const calls = [];
  let registered;
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async (url, options) => {
    calls.push([options.method, new URL(url).pathname]);
    if (url.endsWith('/workers/scripts')) return reply([]);
    if (options.method === 'PUT') {
      registered = JSON.parse(options.body).subdomain;
      assert.match(registered, /^aicheatcode-[a-f0-9]{12}$/);
      assert(!registered.includes(accountId));
      return reply({ subdomain: registered });
    }
    return registered ? reply({ subdomain: registered }) : missingSubdomain();
  } });
  assert.deepEqual(await resolveWorkersSubdomain(client), { subdomain: registered, created: true });
  assert.deepEqual(calls.map(call => call[0]), ['GET', 'GET', 'GET', 'PUT', 'GET']);
});

test('subdomain bootstrap refuses authentication errors, unrelated 404s, and unverified accounts', async () => {
  for (const failure of [() => reply(null, 403), () => reply(null, 404)]) {
    let calls = 0;
    const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async () => { calls++; return failure(); } });
    await assert.rejects(resolveWorkersSubdomain(client));
    assert.equal(calls, 1);
  }
  const methods = [];
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async (url, options) => {
    methods.push(options.method); return url.endsWith('/workers/scripts') ? reply(null, 403) : missingSubdomain();
  } });
  await assert.rejects(resolveWorkersSubdomain(client));
  assert.deepEqual(methods, ['GET', 'GET']);
});

test('subdomain registered during recheck is reused without renaming', async () => {
  let reads = 0;
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async (url, options) => {
    assert.equal(options.method, 'GET');
    if (url.endsWith('/workers/scripts')) return reply([]);
    return ++reads === 1 ? missingSubdomain() : reply({ subdomain: 'registered-elsewhere' });
  } });
  assert.deepEqual(await resolveWorkersSubdomain(client), { subdomain: 'registered-elsewhere', created: false });
});

test('uncertain subdomain registration is read back without repeating the write', async () => {
  let registered, writes = 0;
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async (url, options) => {
    if (url.endsWith('/workers/scripts')) return reply([]);
    if (options.method === 'PUT') { writes++; registered = JSON.parse(options.body).subdomain; throw new TypeError('interrupted after create'); }
    return registered ? reply({ subdomain: registered }) : missingSubdomain();
  } });
  assert.deepEqual(await resolveWorkersSubdomain(client), { subdomain: registered, created: false });
  assert.equal(writes, 1);
});

test('new database creation occurs once and resolves the actual UUID', async () => {
  const calls = [];
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async (_url, opts) => { calls.push(opts.method); return reply(opts.method === 'POST' ? { uuid: id, name } : []); } });
  assert.deepEqual(await resolveDatabase(client, { name }), { id, name, created: true });
  assert.deepEqual(calls, ['GET', 'POST']);
});

test('uncertain create is read back instead of blindly repeated', async () => {
  let reads = 0, writes = 0;
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async (_url, opts) => {
    if (opts.method === 'POST') { writes++; throw new Error('network interrupted after server accepted request'); }
    return reply(++reads === 1 ? [] : [{ uuid: id, name }]);
  } });
  assert.deepEqual(await resolveDatabase(client, { name }), { id, name, created: false });
  assert.equal(writes, 1);
});

test('wrong configured D1 ID/name is rejected before migration', async () => {
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async () => reply({ uuid: id, name: 'another-project' }) });
  await assert.rejects(resolveDatabase(client, { name, id }), /refusing to use another database/);
});

test('read rate limits retry, authentication failures do not retry or leak secrets', async () => {
  let reads = 0;
  const client = new CloudflareClient({ accountId, token: 'test-only-secret', sleep: async () => {}, fetchImpl: async () => ++reads < 3 ? reply(null, 429) : reply([]) });
  assert.deepEqual(await client.request('/d1/database'), []);
  assert.equal(reads, 3);
  reads = 0;
  client.fetchImpl = async () => { reads++; return reply(null, 403); };
  await assert.rejects(client.request('/d1/database'), error => /HTTP 403/.test(error.message) && !error.message.includes('test-only-secret'));
  assert.equal(reads, 1);
  await assert.rejects(client.query(id, 'DELETE FROM editor_state'), /only accepts SELECT/);
});

test('production configuration preserves the generated bundle and asset paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'aicheatcode-config-'));
  try {
    mkdirSync(join(root, 'dist/server'), { recursive: true }); mkdirSync(join(root, 'dist/client'));
    writeFileSync(join(root, 'dist/server/index.js'), 'export default {}');
    writeFileSync(join(root, 'dist/server/wrangler.json'), JSON.stringify({ main: 'index.js', no_bundle: true, assets: { directory: '../client' }, compatibility_flags: ['nodejs_compat'], rules: [{ type: 'ESModule', globs: ['**/*.js'] }] }));
    writeFileSync(join(root, 'wrangler.production.jsonc'), readFileSync(new URL('../wrangler.production.jsonc', import.meta.url)));
    const output = prepareConfig({ root, accountId, database: { id, name }, workerName: 'aicheatcode-v5', commit });
    const config = JSON.parse(readFileSync(output));
    assert.equal(config.main, 'index.js'); assert.equal(config.assets.directory, '../client');
    assert.equal(config.d1_databases[0].database_id, id);
    assert.deepEqual(config.routes, [{pattern:'cannybrainy.com',custom_domain:true}], 'Primary Custom Domain must be present in deployed Worker config');
    assert.equal(config.d1_databases[0].migrations_dir, '../../database/migrations');
    assert.equal(config.vars.DEPLOY_COMMIT, commit);
    assert.equal(config.rules[0].type, 'ESModule');
    assert.throws(() => prepareConfig({ root, accountId, database: { id: '00000000-0000-4000-8000-000000000000', name }, workerName: 'aicheatcode-v5', commit }), /Placeholder/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

function workerFixture({ stale = false, editorAllowed = false, differentDatabase = false } = {}) {
  return async (value, options) => {
    assert.equal(options.redirect, 'error');
    assert(!options.headers.Authorization, 'Control-plane API credentials must never be sent to the public Worker');
    const url = new URL(value);
    if (url.pathname === '/api/health') return Response.json({ status: 'ok', database: 'd1', promptCount: 1071, commit: stale ? 'c'.repeat(40) : commit });
    if (url.pathname === '/') return new Response('<html><head><link rel="stylesheet" href="/hub.css?v=5"></head><body><h1>AICHEATCODE</h1></body></html>');
    if (url.pathname === '/api/prompts') return Response.json({ prompts: [{ id: differentDatabase ? 'WRONG-ID' : 'SOURCE-1', prompt_text: 'A real source text' }, { id: 'SOURCE-2', prompt_text: 'Another source text' }] });
    if (url.pathname === '/api/content') return Response.json({ prompts: [{ id: 'SOURCE-1' }] });
    if (url.pathname === '/api/editor') return new Response('{}', { status: editorAllowed ? 200 : 403 });
    return new Response('robots/sitemap');
  };
}

test('HTTP smoke verifies commit, D1/API agreement, and anonymous editor denial', async () => {
  const result = await smokeProduction({ url: 'https://example.invalid', commit, firstPromptId: 'SOURCE-1', fetchImpl: workerFixture(), attempts: 1 });
  assert.equal(result.status, 'PASS'); assert.equal(result.checks.length, 6);
});

test('smoke drains denied responses before issuing the next HTTP request', async () => {
  const fixture = workerFixture();
  let previous;
  const fetchImpl = async (...args) => {
    if (previous) assert(previous.bodyUsed, 'Previous response body was left unread');
    previous = await fixture(...args);
    return previous;
  };
  const result = await smokeProduction({ url: 'https://example.invalid', commit, fetchImpl, attempts: 1 });
  assert.equal(result.status, 'PASS');
  assert(previous.bodyUsed);
});

test('smoke retries bounded GET transport failures without retrying writes or HTTP failures', async () => {
  const fixture = workerFixture();
  let robotsCalls = 0;
  const options = { url: 'https://example.invalid', commit, attempts: 1, requestDelayMs: 0 };
  await smokeProduction({ ...options, fetchImpl: async (url, init) => {
    if (url.endsWith('/robots.txt') && ++robotsCalls < 3) throw new DOMException('test timeout', 'TimeoutError');
    return fixture(url, init);
  } });
  assert.equal(robotsCalls, 3);
  let puts = 0;
  await assert.rejects(smokeProduction({ ...options, fetchImpl: async (url, init) => {
    if (init.method === 'PUT') { puts++; throw new TypeError('test transport interruption'); }
    return fixture(url, init);
  } }), /PUT \/api\/editor failed/);
  assert.equal(puts, 1);
  robotsCalls = 0;
  await assert.rejects(smokeProduction({ ...options, fetchImpl: async (url, init) => {
    if (url.endsWith('/robots.txt')) { robotsCalls++; throw new TypeError('test network failure'); }
    return fixture(url, init);
  } }), /GET \/robots.txt failed/);
  assert.equal(robotsCalls, 3);
  let homes = 0;
  await assert.rejects(smokeProduction({ ...options, fetchImpl: async (url, init) => {
    if (new URL(url).pathname === '/') { homes++; return new Response('unavailable', { status: 503 }); }
    return fixture(url, init);
  } }));
  assert.equal(homes, 1);
});

test('HTTP 200 from an old commit cannot become a production PASS', async () => {
  await assert.rejects(smokeProduction({ url: 'https://example.invalid', commit, fetchImpl: workerFixture({ stale: true }), attempts: 1 }), /different commit/);
});

test('smoke fails if the API uses another database or editor access is exposed', async () => {
  await assert.rejects(smokeProduction({ url: 'https://example.invalid', commit, firstPromptId: 'SOURCE-1', fetchImpl: workerFixture({ differentDatabase: true }), attempts: 1 }), /D1 database differ/);
  await assert.rejects(smokeProduction({ url: 'https://example.invalid', commit, fetchImpl: workerFixture({ editorAllowed: true }), attempts: 1 }), /must be denied/);
});

test('production URLs reject plaintext HTTP, credentials, query strings and paths', () => {
  for (const url of ['http://example.invalid', 'https://user:secret@example.invalid', 'https://example.invalid/?token=secret', 'https://example.invalid/path']) assert.throws(() => productionOrigin(url));
  assert.equal(productionOrigin('https://example.invalid/'), 'https://example.invalid');
  assert.equal(productionOrigin('http://127.0.0.1:8787', { allowLocal: true }), 'http://127.0.0.1:8787');
});
