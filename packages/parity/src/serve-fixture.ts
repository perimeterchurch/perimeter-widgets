import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from './pipelines.ts';

export const FIXTURE_PORT = 4173;

export function startFixtureServer(port = FIXTURE_PORT) {
  const fixture = readFileSync(
    path.join(repoRoot, 'packages/parity/fixtures/wordpress.html'),
    'utf8',
  );
  const widgetsDir = path.join(repoRoot, 'widgets');
  const built = () =>
    readdirSync(widgetsDir).filter((n) => existsSync(path.join(widgetsDir, n, 'dist/index.js')));

  const server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]!;
    const send = (code: number, type: string, body: string | Buffer) => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };
    if (url === '/loader.js') {
      return send(200, 'text/javascript', readFileSync(path.join(repoRoot, 'cdn/loader.js')));
    }
    if (url === '/manifest.json') {
      return send(
        200,
        'application/json',
        JSON.stringify(Object.fromEntries(built().map((n) => [n, 'dev']))),
      );
    }
    const page = /^\/([\w-]+)\.html$/.exec(url);
    if (page) return send(200, 'text/html', fixture.replaceAll('__WIDGET__', page[1]!));
    const bundle = /^\/([\w-]+)\/dev\/(index\.js(?:\.map)?)$/.exec(url);
    if (bundle) {
      const file = path.join(widgetsDir, bundle[1]!, 'dist', bundle[2]!);
      if (existsSync(file)) {
        return send(
          200,
          bundle[2]!.endsWith('.map') ? 'application/json' : 'text/javascript',
          readFileSync(file),
        );
      }
    }
    send(404, 'text/plain', 'not found');
  });
  server.listen(port);
  return server;
}

// CLI entry: `tsx packages/parity/src/serve-fixture.ts`
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  startFixtureServer();
  console.log(`fixture server on http://localhost:${FIXTURE_PORT}`);
}
