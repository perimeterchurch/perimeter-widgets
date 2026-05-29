export type QueryValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | ReadonlyArray<string | number | boolean>;

export function serializeQuery(params: Record<string, QueryValue>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (isArray(value)) {
      for (const item of value) parts.push(`${enc(key)}=${enc(item)}`);
      continue;
    }
    if (value instanceof Date) {
      parts.push(`${enc(key)}=${enc(toIsoDate(value))}`);
      continue;
    }
    parts.push(`${enc(key)}=${enc(value)}`);
  }
  return parts.join('&');
}

function isArray(v: QueryValue): v is ReadonlyArray<string | number | boolean> {
  return Array.isArray(v);
}

function enc(v: string | number | boolean): string {
  return encodeURIComponent(String(v));
}

function toIsoDate(d: Date): string {
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0');
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = d.getUTCDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
