import { describe, it, expect, beforeAll } from 'vitest';
import { isSameOriginRequest } from './same-origin';

const ORIGIN = 'https://style.perimeter.org';

beforeAll(() => {
  process.env.BETTER_AUTH_URL = ORIGIN;
});

function req(method: string, headers: Record<string, string> = {}) {
  return { method, headers: new Headers(headers) };
}

describe('isSameOriginRequest', () => {
  it('lets safe methods through without any origin header', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS', 'get']) {
      expect(isSameOriginRequest(req(method))).toBe(true);
    }
  });

  it('accepts a same-origin POST', () => {
    expect(isSameOriginRequest(req('POST', { origin: ORIGIN }))).toBe(true);
  });

  it('rejects a cross-site POST', () => {
    expect(isSameOriginRequest(req('POST', { origin: 'https://evil.example' }))).toBe(false);
  });

  it('falls back to Referer when Origin is absent', () => {
    expect(isSameOriginRequest(req('POST', { referer: `${ORIGIN}/tokens` }))).toBe(true);
    expect(isSameOriginRequest(req('POST', { referer: 'https://evil.example/x' }))).toBe(false);
  });

  it('prefers Origin over Referer when both are present', () => {
    expect(
      isSameOriginRequest(
        req('POST', { origin: 'https://evil.example', referer: `${ORIGIN}/tokens` }),
      ),
    ).toBe(false);
  });

  it('rejects a state-changing request carrying neither header', () => {
    expect(isSameOriginRequest(req('POST'))).toBe(false);
    expect(isSameOriginRequest(req('DELETE'))).toBe(false);
  });

  it('treats an unparseable Origin as not matching', () => {
    expect(isSameOriginRequest(req('POST', { origin: 'not-a-url' }))).toBe(false);
  });
});
