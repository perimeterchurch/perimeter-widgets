import { releaseStore } from '@/lib/store';
import { IMMUTABLE, JS_CONTENT_TYPE } from '@/lib/cache';

type Ctx = { params: Promise<{ name: string; version: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { name, version } = await ctx.params;
  const stream = await releaseStore().readBundle(`${name}/${version}/index.js`);
  if (!stream) return new Response('not found', { status: 404 });
  return new Response(stream, {
    headers: { 'content-type': JS_CONTENT_TYPE, 'cache-control': IMMUTABLE },
  });
}
