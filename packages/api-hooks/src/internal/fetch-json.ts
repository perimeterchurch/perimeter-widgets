export interface FetchClient {
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
}

export async function fetchJson<T>(client: FetchClient, path: string, label: string): Promise<T> {
  const res = await client.fetch(path);
  if (!res.ok) throw new Error(`${label} request failed: ${res.status}`);
  return (await res.json()) as T;
}
