import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadWidgetTemplate, writeScaffold } from '../src/scaffold-fs';

let dir: string | null = null;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

describe('scaffold to disk', () => {
  it('writes the rendered template with no placeholders left', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'wscaf-'));
    const target = path.join(dir, 'event-list');
    writeScaffold(target, 'event-list', loadWidgetTemplate());
    expect(existsSync(path.join(target, 'package.json'))).toBe(true);
    expect(existsSync(path.join(target, 'src/widget.tsx'))).toBe(true);
    const pkg = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8')) as {
      name: string;
    };
    expect(pkg.name).toBe('@perimeter/widget-event-list');
    // recursively assert no file contains __NAME__
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
      );
    for (const f of walk(target)) expect(readFileSync(f, 'utf8')).not.toContain('__NAME__');
  });
});
