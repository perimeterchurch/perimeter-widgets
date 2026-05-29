import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const { name } = await ctx.params;
  const distRoot = process.env['WIDGET_DIST_ROOT'];
  if (!distRoot) return new NextResponse('no dist root', { status: 500 });
  const filePath = path.join(distRoot, name, `${name}.iife.js`);
  try {
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return new NextResponse('not found', { status: 404 });
  }
}
