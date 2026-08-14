import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildEndSessionUrl, _clearDiscoveryCacheForTests } from './end-session';

const MP_BASE = 'https://ministryplatform.perimeter.org/ministryplatformapi';
const END_SESSION = `${MP_BASE}/oauth/connect/endsession`;
const RETURN_TO = 'https://style.perimeter.org/sign-in';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  _clearDiscoveryCacheForTests();
  process.env.MP_API_BASEURL = MP_BASE;
  delete process.env.STUDIO_SKIP_MP_END_SESSION;
  fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ end_session_endpoint: END_SESSION }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildEndSessionUrl', () => {
  it('sends the id_token_hint and the return URL when an ID token is available', async () => {
    const url = new URL((await buildEndSessionUrl('id-token-abc', RETURN_TO))!);
    expect(url.origin + url.pathname).toBe(END_SESSION);
    expect(url.searchParams.get('id_token_hint')).toBe('id-token-abc');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(RETURN_TO);
  });

  it('omits the return URL without an ID token (MP ignores it unhinted)', async () => {
    const url = new URL((await buildEndSessionUrl(undefined, RETURN_TO))!);
    expect(url.origin + url.pathname).toBe(END_SESSION);
    expect(url.searchParams.get('post_logout_redirect_uri')).toBeNull();
    expect(url.searchParams.get('id_token_hint')).toBeNull();
  });

  it('returns null when the MP hop is switched off', async () => {
    process.env.STUDIO_SKIP_MP_END_SESSION = '1';
    expect(await buildEndSessionUrl('id-token-abc', RETURN_TO)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when discovery advertises no end_session_endpoint', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ issuer: 'x' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await buildEndSessionUrl('id-token-abc', RETURN_TO)).toBeNull();
  });

  it('returns null when discovery is unreachable (local sign-out still works)', async () => {
    fetchMock.mockRejectedValue(new Error('ENOTFOUND'));
    expect(await buildEndSessionUrl('id-token-abc', RETURN_TO)).toBeNull();
  });

  it('returns null when MP_API_BASEURL is unset', async () => {
    delete process.env.MP_API_BASEURL;
    expect(await buildEndSessionUrl('id-token-abc', RETURN_TO)).toBeNull();
  });

  it('caches discovery across calls', async () => {
    await buildEndSessionUrl('a', RETURN_TO);
    await buildEndSessionUrl('b', RETURN_TO);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
