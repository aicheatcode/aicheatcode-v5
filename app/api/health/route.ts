import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET() {
  try {
    if (!env.DB) throw new Error('Missing DB binding');
    const result = await env.DB.prepare('SELECT COUNT(*) AS count FROM prompt_records').first<{ count: number }>();
    const promptCount = Number(result?.count ?? 0);
    if (promptCount < 1071) throw new Error('Prompt bootstrap is incomplete');
    return Response.json({
      status: 'ok', database: 'd1', promptCount,
      commit: env.DEPLOY_COMMIT ?? null,
    }, { headers });
  } catch {
    return Response.json({ status: 'unavailable', database: 'd1' }, { status: 503, headers });
  }
}
