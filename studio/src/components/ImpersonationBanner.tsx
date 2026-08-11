import { Button } from '@perimeter/ui/button';
import { useImpersonation } from '../lib/impersonation-context';

/**
 * Persistent, hard-to-miss banner shown while impersonating. Renders nothing
 * otherwise, so it's invisible in normal use, standalone dev, and the visual
 * suite.
 */
export function ImpersonationBanner() {
  const { targetUserId, stop } = useImpersonation();
  if (targetUserId == null) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-black"
    >
      <span>
        Viewing as MP User_ID <strong>{targetUserId}</strong> — impersonating. Data shown is this
        user&rsquo;s.
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void stop()}
        className="border-black/40 bg-transparent text-black hover:bg-black/10"
      >
        Stop
      </Button>
    </div>
  );
}
