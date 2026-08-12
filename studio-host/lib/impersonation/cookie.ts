import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Sign/verify the impersonation target so the cookie is tamper-evident and
 * provably issued by the server (via `/api/impersonate/start`). The value is
 * `<userId>.<hmac>`; a bad or missing signature reads back as `null`.
 *
 * (The proxy also re-checks the session is an Administrator on every request,
 * so this is defense in depth, not the sole control.)
 */
function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) {
    throw new Error('BETTER_AUTH_SECRET is required to sign impersonation cookies');
  }
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function signTarget(userId: number): string {
  const payload = String(userId);
  return `${payload}.${sign(payload)}`;
}

export function readTarget(cookieValue: string | null | undefined): number | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = cookieValue.slice(0, dot);
  const provided = Buffer.from(cookieValue.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }
  const userId = Number(payload);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}
