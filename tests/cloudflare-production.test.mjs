import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloudflareClient, prepareConfig, resolveDatabase } from '../scripts/deploy-cloudflare.mjs';
import { productionOrigin, smokeProduction } from '../scripts/cloudflare-smoke.mjs';

const accountId = 'a'.repeat(32);
const id = '11111111-1111-4111-8111-111111111111';
const name = 'aicheatcode-v5-production';
const commit = 'b'.repeat(40);
const reply = (result, status = 200) => Response.json({ success: status === 200, result, errors: status === 200 ? [] : [{ code: 10000 }] }, { status });

test('existing D1 is reused without creating or overwriting a database', async () => {
  const calls = [];
  const client = new CloudflareClient({ accountId, token: 'test-only-token', fetchImpl: async (url, opts) => { calls.push(opts.method); assert(url.startsWith(`https://api.cloudflare.com/client/v4/accounts/${accountId}/`)); return reply([{ uuid: id, name }]); } });
  assert.deepEqual(await resolveDatabase(client, { name }), { id, name, created: false });
  assert.deepEqual(calls, ['GET']);
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
    if (url.pathname === '/') return new Response('<h1>AICHEATCODE</h1>');
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
