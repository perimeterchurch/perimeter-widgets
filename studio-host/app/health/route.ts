// Trivial health endpoint — also gives the App Router a real route so the
// shell builds while `/` is served by the SPA-fallback rewrite.
export function GET() {
  return Response.json({ ok: true, shell: 'studio-host' });
}
