import { releaseStore } from '@/lib/store';
import { POINTER } from '@/lib/cache';

type Ctx = { params: Promise<{ name: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { name } = await ctx.params;
  const version = await releaseStore().getLatest(name);
  if (!version) return new Response('not found', { status: 404 });
  return new Response(null, {
    status: 302,
    headers: { location: `/${name}/${version}/index.js`, 'cache-control': POINTER },
  });
}
