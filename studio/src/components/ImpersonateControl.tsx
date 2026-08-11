import { useState } from 'react';
import { Button } from '@perimeter/ui/button';
import { useImpersonation } from '../lib/impersonation-context';

/**
 * Admin-only header control to start impersonating another MP user by User_ID.
 * Renders nothing unless the viewer is an Administrator behind the shell, or
 * while already impersonating (the banner owns Stop). Search-by-name is a later
 * enhancement (needs the perimeter-api admin user-search endpoint).
 */
export function ImpersonateControl() {
  const { isAdmin, targetUserId, start } = useImpersonation();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (!isAdmin || targetUserId != null) return null;

  const submit = async () => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      setError(true);
      return;
    }
    setBusy(true);
    setError(false);
    const ok = await start(id);
    setBusy(false);
    if (!ok) setError(true);
  };

  return (
    <form
      className="hidden items-center gap-1 md:flex"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(false);
        }}
        placeholder="Impersonate User_ID"
        aria-label="Impersonate a user by MP User_ID"
        aria-invalid={error}
        className="h-9 w-44 rounded-md border border-chrome-border bg-chrome-bg px-2 text-sm text-chrome-fg placeholder:text-muted-fg aria-[invalid=true]:border-red-500"
      />
      <Button type="submit" variant="outline" size="sm" disabled={busy || value === ''}>
        {busy ? 'Starting…' : 'Impersonate'}
      </Button>
    </form>
  );
}
