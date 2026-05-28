import { releaseStore } from '@/lib/store';
import { IMMUTABLE } from '@/lib/cache';

type Ctx = { params: Promise<{ name: string; version: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { name, version } = await ctx.params;
  const stream = await releaseStore().readBundle(`${name}/${version}/index.js.map`);
  if (!stream) return new Response('not found', { status: 404 });
  return new Response(stream, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': IMMUTABLE },
  });
}
