import * as React from 'react';
import { Check, TriangleAlert } from 'lucide-react';
import { useSaveMissionLetter } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import { LetterEditor } from './LetterEditor';

export interface LetterSectionProps {
  pledgeId: number;
  /** The saved letter as HTML, or `null` when the participant has none yet. */
  letter: string | null;
}

type Status = { kind: 'idle' } | { kind: 'saved' } | { kind: 'unchanged' } | { kind: 'error' };

const STATUS_CLASS = {
  saved: 'text-primary',
  unchanged: 'text-muted-fg',
  error: 'text-destructive',
} as const;

/**
 * The participant's support letter: edit and save.
 *
 * Two behaviours differ from the legacy widget on purpose. It rendered the
 * editor only `{letter && …}`, so a participant with no letter got an empty
 * panel and no way to write one — the editor now always renders. And it POSTed
 * straight to a signed Azure Logic App URL embedded in the client bundle; the
 * write now goes through perimeter-api, which can check that the caller owns
 * the pledge.
 */
export function LetterSection({ pledgeId, letter }: LetterSectionProps): React.JSX.Element {
  const saved = letter ?? '';
  const [draft, setDraft] = React.useState(saved);
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' });
  const save = useSaveMissionLetter();

  // A confirmation is transient; a failure stays up until the next attempt so
  // it can't scroll past unnoticed.
  React.useEffect(() => {
    if (status.kind !== 'saved' && status.kind !== 'unchanged') return;
    const timer = setTimeout(() => setStatus({ kind: 'idle' }), 5000);
    return () => clearTimeout(timer);
  }, [status]);

  const onSave = (): void => {
    if (draft === saved) {
      setStatus({ kind: 'unchanged' });
      return;
    }
    setStatus({ kind: 'idle' });
    save.mutate(
      { pledgeId, letter: draft },
      {
        onSuccess: () => setStatus({ kind: 'saved' }),
        onError: () => setStatus({ kind: 'error' }),
      },
    );
  };

  return (
    <section className="grid gap-4">
      <LetterEditor value={draft} onChange={setDraft} disabled={save.isPending} />

      <div className="flex items-center justify-end gap-3">
        <p
          role="status"
          aria-live="polite"
          className={`text-sm ${status.kind === 'idle' ? '' : STATUS_CLASS[status.kind]}`}
        >
          {status.kind === 'saved' && (
            <span className="inline-flex items-center gap-1">
              <Check aria-hidden className="size-4" />
              Letter saved
            </span>
          )}
          {status.kind === 'unchanged' && 'No changes to save'}
          {status.kind === 'error' && (
            <span className="inline-flex items-center gap-1">
              <TriangleAlert aria-hidden className="size-4" />
              {save.error?.message ?? 'Failed to save letter'}
            </span>
          )}
        </p>

        <Button type="button" variant="primary" onClick={onSave} disabled={save.isPending}>
          {save.isPending && <Spinner className="mr-2 size-4" />}
          {save.isPending ? 'Saving…' : 'Save letter'}
        </Button>
      </div>
    </section>
  );
}
