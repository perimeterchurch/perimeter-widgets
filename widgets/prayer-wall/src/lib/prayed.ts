/**
 * Which requests this browser has already prayed for.
 *
 * The wall this replaces kept that in React state alone, so a page reload
 * brought the "I Prayed" button back and the same person could keep pushing the
 * count up. Persisting the ids means the card shows the count instead — the
 * design is unchanged, the number is just harder to inflate by accident.
 *
 * Deliberately per-browser and best-effort: it is a courtesy, not an
 * entitlement check, and a visitor who clears storage can pray again. Storage
 * failures (Safari private mode, a host page that blocks it) are swallowed —
 * losing the memory must never stop someone praying.
 */
const STORAGE_KEY = 'perimeter-prayer-wall:prayed';

/** Cap the remembered set so the key cannot grow without bound. */
const MAX_REMEMBERED = 500;

function read(): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === 'number');
  } catch {
    return [];
  }
}

export function loadPrayedIds(): Set<number> {
  return new Set(read());
}

/** Add an id and return the resulting set, oldest entries dropped past the cap. */
export function rememberPrayedId(id: number): Set<number> {
  const next = [...read().filter((existing) => existing !== id), id].slice(-MAX_REMEMBERED);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — the in-memory set below still holds for this page.
  }
  return new Set(next);
}
