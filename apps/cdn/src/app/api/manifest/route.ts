import { releaseStore } from '@/lib/store';
import { POINTER } from '@/lib/cache';

export async function GET(): Promise<Response> {
  const widgets = await releaseStore().listWidgets();
  const manifest = Object.fromEntries(widgets.map((name) => [name, `/${name}/latest.js`]));
  return new Response(JSON.stringify(manifest), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': POINTER },
  });
}
