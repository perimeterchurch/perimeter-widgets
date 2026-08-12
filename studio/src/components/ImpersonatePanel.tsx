import { useEffect, useRef, useState } from 'react';
import { Button } from '@perimeter/ui/button';
import { useImpersonation, type ImpersonationUser } from '../lib/impersonation-context';

/**
 * Admin-only impersonation panel, shown on an authenticated widget's page (not in
 * the global chrome — impersonation only changes what an auth widget's data
 * resolves to, so it belongs beside the widget it affects).
 *
 * Idle: a debounced name / login / email search picker (matches come from the
 * shell's admin-gated `/api/impersonate/users` proxy) — click a result to
 * impersonate. Active: a hard-to-miss banner naming the target, with Stop.
 *
 * Renders nothing unless the viewer is an Administrator behind the auth shell, so
 * it is invisible in normal use, standalone dev, and the visual suite.
 */
export function ImpersonatePanel() {
  const { isAdmin, targetUserId, targetLabel, stop } = useImpersonation();
  if (!isAdmin) return null;

  return targetUserId != null ? (
    <ActiveBanner label={targetLabel ?? `User_ID ${targetUserId}`} onStop={() => void stop()} />
  ) : (
    <SearchPicker />
  );
}

function ActiveBanner({ label, onStop }: { label: string; onStop: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500 bg-amber-500/15 px-4 py-2.5 text-sm"
    >
      <span className="text-fg">
        Impersonating <strong>{label}</strong> — authenticated widgets below show this user&rsquo;s
        data.
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onStop}>
        Stop impersonating
      </Button>
    </div>
  );
}

function SearchPicker() {
  const { searchUsers, start } = useImpersonation();
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

  const pick = async (user: ImpersonationUser) => {
    setStartingId(user.userID);
    const ok = await start(user.userID, user.displayName);
    setStartingId(null);
    if (ok) {
      setOpen(false);
      setQuery('');
      setResults([]);
    }
  };

  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <label
        htmlFor="impersonate-search"
        className="mb-1.5 block text-xs font-medium text-muted-fg"
      >
        Admin: preview this widget as another user
      </label>
      <div ref={boxRef} className="relative max-w-sm">
        <input
          id="impersonate-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search a user by name, login, or email…"
          aria-label="Search for a user to impersonate by name, login, or email"
          className="h-9 w-full rounded-md border border-border bg-bg px-2 text-sm text-fg placeholder:text-muted-fg"
        />
        {open && (
          <ul
            role="listbox"
            className="absolute left-0 z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-bg py-1 shadow-lg"
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
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted disabled:opacity-50"
                >
                  <span className="text-sm text-fg">
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
    </div>
  );
}
