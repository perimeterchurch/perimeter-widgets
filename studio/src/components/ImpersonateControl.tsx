import { useEffect, useRef, useState } from 'react';
import { useImpersonation, type ImpersonationUser } from '../lib/impersonation-context';

/**
 * Admin-only header control to start impersonating another MP user.
 *
 * Type a name / login / email; matches (debounced) come from the shell's
 * admin-gated `/api/impersonate/users` proxy. Click a result to impersonate.
 * Renders nothing unless the viewer is an Administrator behind the shell, or
 * while already impersonating (the banner owns Stop).
 */
export function ImpersonateControl() {
  const { isAdmin, targetUserId, searchUsers, start } = useImpersonation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImpersonationUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search as the admin types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let active = true;
    const handle = setTimeout(() => {
      void searchUsers(q).then((users) => {
        if (!active) return;
        setResults(users);
        setSearching(false);
        setOpen(true);
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query, searchUsers]);

  // Close the results popover on an outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!isAdmin || targetUserId != null) return null;

  const pick = async (user: ImpersonationUser) => {
    setStartingId(user.userID);
    const ok = await start(user.userID);
    setStartingId(null);
    if (ok) {
      setOpen(false);
      setQuery('');
      setResults([]);
    }
  };

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Impersonate a user…"
        aria-label="Search for a user to impersonate by name, login, or email"
        className="h-9 w-56 rounded-md border border-chrome-border bg-chrome-bg px-2 text-sm text-chrome-fg placeholder:text-muted-fg"
      />
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 max-h-72 w-72 overflow-auto rounded-md border border-chrome-border bg-chrome-bg py-1 shadow-lg"
        >
          {searching && <li className="px-3 py-2 text-sm text-muted-fg">Searching…</li>}
          {!searching && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-fg">No matches</li>
          )}
          {results.map((user) => (
            <li key={user.userID}>
              <button
                type="button"
                onClick={() => void pick(user)}
                disabled={startingId != null}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-chrome-border/40 disabled:opacity-50"
              >
                <span className="text-sm text-chrome-fg">
                  {user.displayName}
                  {startingId === user.userID && ' — starting…'}
                </span>
                <span className="text-xs text-muted-fg">
                  {user.userName ? `${user.userName} · ` : ''}
                  {user.email ?? `User_ID ${user.userID}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
