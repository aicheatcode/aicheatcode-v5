import assert from 'node:assert/strict';

export function productionOrigin(value, { allowLocal = false } = {}) {
  const url = new URL(value);
  const local = allowLocal && ['127.0.0.1', 'localhost'].includes(url.hostname);
  assert(url.protocol === 'https:' || (local && url.protocol === 'http:'), 'Production URL must use HTTPS');
  assert(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Use an origin without credentials, path or query');
  return url.origin;
}

export async function smokeProduction({ url, commit, minimumCount = 1071, firstPromptId, fetchImpl = fetch, allowLocal = false, attempts = 12, delayMs = 2000, requestDelayMs = 250 }) {
  const origin = productionOrigin(url, { allowLocal });
  const checks = [];
  async function request(path, options = {}) {
    const method = options.method || 'GET';
    for (let attempt = 0; ; attempt++) {
      let response;
      try {
        response = await fetchImpl(origin + path, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache', ...options.headers } });
        // Drain every response, including editor denials, before reusing connections.
        const body = await response.text();
        return { status: response.status, text: async () => body, json: async () => JSON.parse(body) };
      } catch (error) {
        await response?.body?.cancel().catch(() => {});
        const transportFailure = ['TypeError', 'TimeoutError', 'AbortError'].includes(error.name);
        if (method !== 'GET' || !transportFailure || attempt >= 2) {
          throw new Error(`${method} ${path} failed: ${error.message}`, { cause: error });
        }
        await new Promise(resolve => setTimeout(resolve, requestDelayMs));
      }
    }
  }
  let health;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await request('/api/health');
      assert.equal(response.status, 200);
      health = await response.json();
      assert.equal(health.status, 'ok');
      assert.equal(health.database, 'd1');
      assert.equal(health.commit, commit, 'Production is serving a different commit');
      assert(Number(health.promptCount) >= minimumCount, 'D1 does not contain the required prompt records');
      break;
    } catch (error) {
      if (attempt === attempts - 1) throw new Error(`Production health/commit check failed: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  checks.push({ check: 'D1 health and deployed commit', status: 'PASS', promptCount: health.promptCount });
  const homepage = await request('/');
  assert.equal(homepage.status, 200);
  const html=await homepage.text();
  assert(html.includes('AICHEATCODE'), 'Unexpected homepage');
  assert(html.includes('/hub.css'), 'Public homepage is not the V5 hub');
  assert(!html.includes('/styles.css?v=20261102-repaired'), 'Neon legacy homepage must not be the production default');
  checks.push({ check: 'Homepage HTTP', status: 'PASS' });
  const promptsResponse = await request('/api/prompts?limit=2');
  assert.equal(promptsResponse.status, 200);
  const prompts = await promptsResponse.json();
  assert.equal(prompts.prompts?.length, 2);
  assert(prompts.prompts.every(row => typeof row.id === 'string' && typeof row.prompt_text === 'string' && row.prompt_text.length > 0));
  if (firstPromptId) assert.equal(prompts.prompts[0].id, firstPromptId, 'API and verified D1 database differ');
  checks.push({ check: 'Prompt API and D1 readback', status: 'PASS' });
  const content = await request('/api/content');
  assert.equal(content.status, 200);
  const body = await content.json();
  assert(Array.isArray(body.prompts) && body.prompts.length > 0, 'Content API returned an empty catalog');
  checks.push({ check: 'Content API', status: 'PASS' });
  for (const method of ['GET', 'PUT']) {
    const response = await request('/api/editor', method === 'PUT' ? { method, headers: { 'Content-Type': 'application/json', Origin: origin }, body: '{}' } : {});
    assert.equal(response.status, 403, `Anonymous editor ${method} must be denied`);
  }
  checks.push({ check: 'Anonymous editor GET/PUT denied', status: 'PASS' });
  for (const path of ['/robots.txt', '/sitemap.xml']) {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert((await response.text()).length > 0);
  }
  checks.push({ check: 'Robots and sitemap HTTP', status: 'PASS' });
  return { status: 'PASS', url: origin, commit, checks };
}
