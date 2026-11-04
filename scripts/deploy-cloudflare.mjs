import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { productionOrigin, smokeProduction } from './cloudflare-smoke.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeApiToken(value) {
  assert(typeof value === 'string' && value.trim(), 'CLOUDFLARE_API_TOKEN is required');
  let token = value.trim();
  const unquote = text => (/^(["']).*\1$/s.test(text) ? text.slice(1, -1).trim() : text);
  token = unquote(token);
  // Treat pasted verification examples as data; never execute them.
  if (/\bcurl\b/i.test(token) && token.includes('api.cloudflare.com')) {
    const candidates = [...token.matchAll(/Authorization\s*:\s*Bearer\s+([A-Za-z0-9._~+\/-]+=*)/gi)].map(match => match[1]);
    assert(new Set(candidates).size === 1, 'Paste the single full Cloudflare API token value, not an ambiguous curl example');
    token = candidates[0];
  }
  token = unquote(token.replace(/^Bearer\s+/i, '').trim());
  assert(token && !/[\s"'`]/.test(token), 'CLOUDFLARE_API_TOKEN must contain the token value only; copy the full value from Cloudflare');
  return token;
}

export class CloudflareClient {
  constructor({ accountId, token, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) }) {
    accountId = typeof accountId === 'string' ? accountId.trim() : accountId;
    assert(/^[a-f0-9]{32}$/i.test(accountId), 'CLOUDFLARE_ACCOUNT_ID must be a 32-character account identifier');
    token = normalizeApiToken(token);
    assert(token !== accountId, 'CLOUDFLARE_API_TOKEN contains the Account ID; replace it with the full API token value from Cloudflare');
    Object.assign(this, { accountId, token, fetchImpl, sleep });
  }
  async request(path, { method = 'GET', body, readOnly = method === 'GET' } = {}) {
    assert(path.startsWith('/'), 'Relative Cloudflare API path required');
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}${path}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      let response;
      try {
        response = await this.fetchImpl(url, { method, redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      } catch {
        if (readOnly && attempt < 2) { await this.sleep(1000 * 2 ** attempt); continue; }
        throw new Error('Cloudflare API network request failed; no deployment result is assumed');
      }
      if (readOnly && (response.status === 429 || response.status >= 500) && attempt < 2) { await this.sleep(1000 * 2 ** attempt); continue; }
      let data;
      try { data = await response.json(); } catch { throw new Error(`Cloudflare API returned non-JSON (HTTP ${response.status})`); }
      if (!response.ok || data.success !== true) {
        const codes = (data.errors || []).map(e => e.code).filter(x => Number.isInteger(x)).join(',');
        if ((data.errors || []).some(e => e.code === 9106)) {
          throw new Error('Cloudflare rejected CLOUDFLARE_API_TOKEN (HTTP ' + response.status + ', code 9106: authentication failed). Replace that GitHub Secret with a valid full API token from Cloudflare.');
        }
        throw Object.assign(new Error(`Cloudflare API rejected ${method} ${path.split('?')[0]} (HTTP ${response.status}, codes ${codes || 'unknown'})`), {
          httpStatus: response.status, codes: (data.errors || []).map(error => error.code).filter(Number.isInteger),
        });
      }
      return data.result;
    }
  }
  async query(id, sql, params = []) {
    assert(UUID.test(id), 'Invalid D1 identifier');
    assert(/^\s*SELECT\b/i.test(sql), 'The retryable D1 query helper only accepts SELECT');
    const results = await this.request(`/d1/database/${id}/query`, { method: 'POST', body: { sql, params }, readOnly: true });
    assert(Array.isArray(results) && results.every(r => r.success !== false), 'D1 query failed');
    return results[0]?.results ?? [];
  }
}

export async function resolveWorkersSubdomain(client) {
  const missing = error => error.httpStatus === 404 && error.codes?.includes(10007);
  const verified = (value, created) => {
    assert(value?.subdomain && NAME.test(value.subdomain), 'Cloudflare did not return a valid workers.dev subdomain');
    return { subdomain: value.subdomain, created };
  };
  try { return verified(await client.request('/workers/subdomain'), false); }
  catch (error) { if (!missing(error)) throw error; }
  // Confirm account access and recheck absence before an account-level create.
  const workers = await client.request('/workers/scripts');
  assert(Array.isArray(workers), 'Could not verify Workers account access before subdomain registration');
  try { return verified(await client.request('/workers/subdomain'), false); }
  catch (error) { if (!missing(error)) throw error; }
  const suffix = createHash('sha256').update(client.accountId).digest('hex').slice(0, 12);
  const subdomain = `aicheatcode-${suffix}`;
  let created;
  try {
    created = verified(await client.request('/workers/subdomain', { method: 'PUT', body: { subdomain } }), true);
  } catch (error) {
    // An interrupted registration may have succeeded; never repeat the write.
    try { return verified(await client.request('/workers/subdomain'), false); }
    catch { throw error; }
  }
  assert.equal(created.subdomain, subdomain, 'Cloudflare registered an unexpected subdomain');
  const confirmed = verified(await client.request('/workers/subdomain'), true);
  assert.equal(confirmed.subdomain, subdomain, 'Workers subdomain readback differs from registration');
  return confirmed;
}

export async function resolveDatabase(client, { name, id }) {
  assert(NAME.test(name), 'Invalid D1 database name');
  function verified(row, created) {
    assert(row && UUID.test(row.uuid) && !/^00000000-/.test(row.uuid), 'Cloudflare did not return a real D1 database ID');
    assert.equal(row.name, name, 'D1 name and configured ID differ; refusing to use another database');
    return { id: row.uuid, name, created };
  }
  if (id) {
    assert(UUID.test(id) && !/^00000000-/.test(id), 'Invalid CLOUDFLARE_D1_DATABASE_ID');
    return verified(await client.request(`/d1/database/${id}`), false);
  }
  async function lookup() {
    const rows = await client.request(`/d1/database?name=${encodeURIComponent(name)}&per_page=10000`);
    const matches = rows.filter(row => row.name === name);
    assert(matches.length <= 1, 'D1 database name is ambiguous');
    return matches[0];
  }
  const existing = await lookup();
  if (existing) return verified(existing, false);
  try { return verified(await client.request('/d1/database', { method: 'POST', body: { name } }), true); }
  catch (error) {
    // A timed-out create may have succeeded. Read back instead of creating twice.
    const found = await lookup();
    if (found) return verified(found, false);
    throw error;
  }
}

export function prepareConfig({ root = ROOT, accountId, database, workerName, commit }) {
  assert(NAME.test(workerName), 'Invalid Worker name');
  assert(UUID.test(database.id) && !/^00000000-/.test(database.id), 'Placeholder D1 IDs cannot be deployed');
  assert(/^[a-f0-9]{40}$/i.test(commit), 'A full source commit SHA is required');
  const output = resolve(root, 'dist/server/wrangler.production.json');
  const base = JSON.parse(readFileSync(resolve(root, 'dist/server/wrangler.json'), 'utf8'));
  const policy = JSON.parse(readFileSync(resolve(root, 'wrangler.production.jsonc'), 'utf8'));
  assert(base.no_bundle === true && existsSync(resolve(dirname(output), base.main)), 'Build the Worker before preparing production configuration');
  assert(base.assets?.directory && existsSync(resolve(dirname(output), base.assets.directory)), 'Built client assets are missing');
  const config = {
    ...base, name: workerName, topLevelName: workerName, account_id: accountId,
    workers_dev: policy.workers_dev, preview_urls: policy.preview_urls,
    observability: policy.observability, vars: { ...base.vars, DEPLOY_COMMIT: commit },

    d1_databases: [{ binding: 'DB', database_name: database.name, database_id: database.id, migrations_dir: relative(dirname(output), resolve(root, 'database/migrations')).replaceAll('\\', '/') }],
  };
  // Access settings are server-only Worker variables, not browser JavaScript.
  const access = ['CF_ACCESS_TEAM_DOMAIN','CF_ACCESS_AUD','CMS_OWNER_EMAIL'];
  const present = access.filter(key => typeof process.env[key] === 'string' && process.env[key].trim());
  if (present.length && present.length !== access.length) throw Error('Set all three CMS Access variables, not a partial configuration');
  for (const key of present) config.vars[key] = process.env[key].trim();
  writeFileSync(output, JSON.stringify(config, null, 2) + '\n');
  return output;
}

function runWrangler(args, { capture = false } = {}) {
  const result = spawnSync(process.execPath, [resolve(ROOT, 'node_modules/wrangler/bin/wrangler.js'), ...args], { cwd: ROOT, env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1' }, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', maxBuffer: 4 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  if (result.error || result.status !== 0) throw new Error(`Wrangler ${args.slice(0, 3).join(' ')} failed; inspect the preceding step logs`);
  return result.stdout;
}

export async function deployProduction() {
  const env = process.env;
  const client = new CloudflareClient({ accountId: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_API_TOKEN });
  // Wrangler must receive the same normalized credential as the REST client.
  if (env.GITHUB_ACTIONS === 'true') {
    console.log('::add-mask::' + client.token);
    console.log('::add-mask::' + client.accountId);
  }
  env.CLOUDFLARE_API_TOKEN = client.token;
  env.CLOUDFLARE_ACCOUNT_ID = client.accountId;
  const policy = JSON.parse(readFileSync(resolve(ROOT, 'wrangler.production.jsonc'), 'utf8'));
  const workerName = env.CLOUDFLARE_WORKER_NAME || policy.name;
  const databaseName = env.CLOUDFLARE_D1_DATABASE_NAME || policy.d1_databases[0].database_name;
  const output = resolve(ROOT, '.cloudflare/production');
  mkdirSync(output, { recursive: true });
  const report = { status: 'RUNNING', commit: env.GITHUB_SHA, worker: workerName, checks: [] };
  const save = () => writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    assert(NAME.test(workerName) && NAME.test(databaseName), 'Invalid configured Worker or D1 database name');
    assert(/^[a-f0-9]{40}$/i.test(env.GITHUB_SHA || ''), 'GITHUB_SHA must identify the verified build before provisioning');
    assert(existsSync(resolve(ROOT, 'dist/server/wrangler.json')), 'The verified Worker build artifact is missing');
    const account = await resolveWorkersSubdomain(client);
    report.subdomain = account;
    report.checks.push({ check: 'Workers subdomain verified', status: 'PASS', created: account.created });
    save();
    const autoUrl = `https://${workerName}.${account.subdomain}.workers.dev`;
    const url = productionOrigin(env.PRODUCTION_URL || autoUrl);
    const database = await resolveDatabase(client, { name: databaseName, id: env.CLOUDFLARE_D1_DATABASE_ID || undefined });
    report.database = { id: database.id, name: database.name, created: database.created };
    const config = prepareConfig({ accountId: client.accountId, database, workerName, commit: env.GITHUB_SHA });
    if (!database.created) {
      const recovery = JSON.parse(runWrangler(['d1', 'time-travel', 'info', 'DB', '--config', config, '--json'], { capture: true }));
      assert(typeof recovery.bookmark === 'string' && recovery.bookmark.length > 0, 'Could not capture a D1 recovery bookmark; migrations were not started');
      report.recoveryBookmark = recovery.bookmark;
      save();
    }
    runWrangler(['d1', 'migrations', 'apply', 'DB', '--remote', '--config', config]);
    report.checks.push({ check: 'D1 migrations', status: 'PASS' });
    const prepared = spawnSync('python3', [resolve(ROOT, 'scripts/prepare-d1-seed.py'), '--output', output], { encoding: 'utf8' });
    assert.equal(prepared.status, 0, 'Source seed verification failed');
    const manifest = JSON.parse(readFileSync(resolve(output, 'seed-manifest.json'), 'utf8'));
    const marker = await client.query(database.id, 'SELECT value FROM catalog_manifest WHERE key=?', [manifest.key]);
    if (marker.length) assert.equal(marker[0].value, manifest.sha256, 'Seed changed after production bootstrap; add an explicit data migration');
    else runWrangler(['d1', 'execute', 'DB', '--remote', '--config', config, '--file', resolve(output, 'seed.sql')]);
    let matched = 0;
    for (let offset = 0; offset < manifest.ids.length; offset += 80) {
      const ids = manifest.ids.slice(offset, offset + 80);
      const rows = await client.query(database.id, `SELECT COUNT(*) AS count FROM prompt_records WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
      matched += Number(rows[0]?.count ?? 0);
    }
    assert.equal(matched, manifest.count, 'Production D1 is missing source prompt IDs');
    const counts = await client.query(database.id, 'SELECT COUNT(*) AS count,COUNT(DISTINCT id) AS uniqueCount FROM prompt_records');
    assert(Number(counts[0]?.count) >= manifest.count && counts[0].count === counts[0].uniqueCount, 'D1 count/integrity verification failed');
    const first = await client.query(database.id, 'SELECT id FROM prompt_records ORDER BY id LIMIT 1');
    report.checks.push({ check: 'Production D1 source IDs and unique count', status: 'PASS', sourceRecords: matched, total: Number(counts[0].count) });
    save();
    runWrangler(['deploy', '--config', config, '--keep-vars']);
    report.workerUploaded = true;
    save();
    const smoke = await smokeProduction({ url, commit: env.GITHUB_SHA, minimumCount: manifest.count, firstPromptId: first[0].id });
    report.checks.push(...smoke.checks);
    Object.assign(report, { status: 'PASS', url: smoke.url });
    save();
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `url=${smoke.url}\n`);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `## Cloudflare production: PASS\n\nURL: ${smoke.url}\n\nCommit: ${env.GITHUB_SHA}\n\nVerified source prompts in D1: ${matched}\n\nWorker HTTP, D1 API readback and anonymous editor denial all passed.\n`);
    console.log(JSON.stringify({ status: 'PASS', url: smoke.url, commit: env.GITHUB_SHA, sourceRecords: matched }));
  } catch (error) {
    report.status = 'FAIL';
    report.error = String(error.message).replaceAll(env.CLOUDFLARE_API_TOKEN || '\0', '[REDACTED]');
    save();
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `## Cloudflare production: FAIL\n\n${report.error}\n\nWorker uploaded: ${Boolean(report.workerUploaded)}. Inspect cloudflare-production-evidence before retrying.\n`);
    throw new Error(report.error);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  deployProduction().catch(error => { console.error(error.message); process.exitCode = 1; });
}
