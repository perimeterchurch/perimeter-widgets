/**
 * Unit tests for cdn/loader.js — the evergreen public embed entry point
 * (decision record: docs/superpowers/decisions/2026-06-11-loader-evergreen-api.md).
 *
 * The loader is a dependency-free IIFE written against five DOM touchpoints
 * (currentScript, querySelectorAll, createElement, head.appendChild,
 * readyState), so it runs here against a hand-rolled stub document in the
 * node environment — no jsdom needed. The full browser flow is exercised
 * end-to-end by packages/parity/visual/visual-parity.spec.ts.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const loaderSrc = readFileSync(
  fileURLToPath(new URL('../../../cdn/loader.js', import.meta.url)),
  'utf8',
);

interface StubDiv {
  attrs: Record<string, string>;
}

interface InjectedScript {
  async?: boolean;
  src?: string;
}

/** Run the loader IIFE against a stub page; resolves after the manifest chain settles. */
async function runLoader(manifest: Record<string, string>, divs: StubDiv[]) {
  const injected: InjectedScript[] = [];
  const stubWindow: Record<string, unknown> = {};
  const stubDocument = {
    currentScript: null,
    readyState: 'complete',
    querySelectorAll: () =>
      divs.map((div) => ({
        getAttribute: (attr: string) => div.attrs[attr] ?? null,
      })),
    createElement: () => {
      const script: InjectedScript = {};
      return script;
    },
    head: {
      appendChild: (script: InjectedScript) => {
        injected.push(script);
      },
    },
    addEventListener: () => {},
  };
  const stubFetch = () =>
    Promise.resolve({
      json: () => Promise.resolve(manifest),
    });

  new Function('window', 'document', 'fetch', loaderSrc)(stubWindow, stubDocument, stubFetch);
  // Let the loader's fetch → json → scan promise chain flush.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return injected;
}

describe('cdn/loader.js', () => {
  it('resolves each widget through the manifest pointer', async () => {
    const injected = await runLoader({ sermons: '1.3.1' }, [
      { attrs: { 'data-perimeter-widget': 'sermons' } },
    ]);
    expect(injected.map((s) => s.src)).toEqual(['/sermons/1.3.1/index.js']);
    expect(injected[0]!.async).toBe(true);
  });

  it('loads each widget once even with duplicate placeholders', async () => {
    const injected = await runLoader({ sermons: '1.3.1' }, [
      { attrs: { 'data-perimeter-widget': 'sermons' } },
      { attrs: { 'data-perimeter-widget': 'sermons' } },
    ]);
    expect(injected).toHaveLength(1);
  });

  it('skips unknown widgets silently', async () => {
    const injected = await runLoader({ sermons: '1.3.1' }, [
      { attrs: { 'data-perimeter-widget': 'not-ours' } },
    ]);
    expect(injected).toHaveLength(0);
  });

  it('data-perimeter-version pins a widget past the manifest pointer (canary)', async () => {
    const injected = await runLoader({ sermons: '1.3.1' }, [
      {
        attrs: {
          'data-perimeter-widget': 'sermons',
          'data-perimeter-version': '1.4.0',
        },
      },
    ]);
    expect(injected.map((s) => s.src)).toEqual(['/sermons/1.4.0/index.js']);
  });

  it('the first placeholder per widget name wins when overrides disagree', async () => {
    const injected = await runLoader({ sermons: '1.3.1' }, [
      {
        attrs: {
          'data-perimeter-widget': 'sermons',
          'data-perimeter-version': '1.4.0',
        },
      },
      { attrs: { 'data-perimeter-widget': 'sermons' } },
    ]);
    expect(injected.map((s) => s.src)).toEqual(['/sermons/1.4.0/index.js']);
  });

  it('an explicit version loads even for a widget absent from the manifest', async () => {
    // Pre-release testing: a bundle published to an immutable path can be
    // canaried before its first manifest promotion.
    const injected = await runLoader({}, [
      {
        attrs: {
          'data-perimeter-widget': 'sermons',
          'data-perimeter-version': '1.4.0-rc.1',
        },
      },
    ]);
    expect(injected.map((s) => s.src)).toEqual(['/sermons/1.4.0-rc.1/index.js']);
  });
});
