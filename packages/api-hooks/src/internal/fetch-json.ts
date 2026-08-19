export interface FetchClient {
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
}

/**
 * A failed perimeter-api request. Carries the HTTP `status` so the UI can
 * distinguish an expired session (401) from a generic outage, and surfaces
 * the server's error message when the response body includes one (perimeter-api
 * returns `{ error: { message } }` / `{ message }`). Mirrors the typed
 * `ApiError` the sibling apps (helpdesk, metrics, assessments) already use.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** A 401 means the MP token is missing/expired/rejected — the session ended. */
  get isAuthError(): boolean {
    return this.status === 401;
  }
}

async function extractMessage(res: Response, label: string): Promise<string> {
  try {
    const body: unknown = await res.clone().json();
    if (body && typeof body === 'object') {
      const envelope = body as { message?: unknown; error?: { message?: unknown } };
      const msg = envelope.error?.message ?? envelope.message;
      if (typeof msg === 'string' && msg.length > 0) return msg;
    }
  } catch {
    // Non-JSON or empty body — fall back to the status-based message.
  }
  return `${label} request failed: ${res.status}`;
}

export async function fetchJson<T>(
  client: FetchClient,
  path: string,
  label: string,
  init?: RequestInit,
): Promise<T> {
  // Only forward `init` when a caller provides it, so read hooks keep calling
  // `client.fetch(path)` with a single argument (matching the FetchClient
  // contract and existing call-site expectations); mutations pass method/body.
  const res = init === undefined ? await client.fetch(path) : await client.fetch(path, init);
  if (!res.ok) {
    throw new ApiError(res.status, await extractMessage(res, label));
  }
  return (await res.json()) as T;
}
