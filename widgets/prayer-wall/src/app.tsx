import * as React from 'react';
import type { AuthProvider } from '@perimeter/auth';
import { usePrayerRequests, usePrayerWallIdentity, useRecordPrayer } from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { Skeleton } from '@perimeter/ui/skeleton';
import type { PrayerWallConfig } from './types';
import { PrayerCard } from './components/PrayerCard';
import { FeedPager } from './components/FeedPager';
import { RequestForm } from './components/RequestForm';
import { loadPrayedIds, rememberPrayedId } from './lib/prayed';

export interface AppProps {
  config: PrayerWallConfig;
  auth: AuthProvider;
}

function MessageState({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-32 items-center justify-center border border-border bg-muted p-6 text-center font-sans text-base text-muted-fg">
      {children}
    </div>
  );
}

function LoadingState({ count }: { count: number }): React.JSX.Element {
  return (
    <ul className="grid gap-8">
      {Array.from({ length: Math.min(count, 4) }, (_, i) => (
        <li key={i} className="border border-border p-6 @md:p-8">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-5 h-11 w-64" />
        </li>
      ))}
    </ul>
  );
}

/**
 * The prayer wall: a collapsed bar that opens the request form, and the feed of
 * approved requests below it.
 *
 * Auth is `optional` — the feed is public and anyone may pray, while the form
 * asks a signed-in member for nothing but their request.
 */
export function App({ config, auth }: AppProps): React.JSX.Element {
  const [formOpen, setFormOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [prayedIds, setPrayedIds] = React.useState<Set<number>>(() => new Set());
  const [prayedCounts, setPrayedCounts] = React.useState<Record<number, number>>({});
  const feedTopRef = React.useRef<HTMLDivElement | null>(null);

  // Read the remembered set after mount rather than during render: it touches
  // localStorage, which a host page can make throw.
  React.useEffect(() => {
    setPrayedIds(loadPrayedIds());
  }, []);

  // The MP login widget writes its token to localStorage after this widget has
  // already mounted, so the session has to be watched, not read once.
  const [signedIn, setSignedIn] = React.useState(() => auth.isAuthenticated());
  React.useEffect(() => auth.onChange(() => setSignedIn(auth.isAuthenticated())), [auth]);

  const identityQuery = usePrayerWallIdentity({ enabled: signedIn });
  const feedQuery = usePrayerRequests(
    { page, perPage: config.perPage, days: config.days },
    { enabled: config.showFeed },
  );
  const recordPrayer = useRecordPrayer();

  const requests = feedQuery.data?.data.requests ?? [];
  const totalPages = feedQuery.data?.data.pagination.totalPages ?? 1;

  function handlePageChange(next: number): void {
    if (next < 1 || next > totalPages || next === page) return;
    setPage(next);
    // Land at the top of the feed, not wherever the button happened to be —
    // the wall has always scrolled to its heading on a page change.
    feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handlePray(id: number): void {
    recordPrayer.mutate(id, {
      onSuccess: (result) => {
        setPrayedCounts((current) => ({ ...current, [id]: result.data.prayerCount }));
        setPrayedIds(rememberPrayedId(id));
      },
    });
  }

  return (
    <div className="@container p-4 text-left">
      {config.showForm && (
        <section className="mb-8">
          <Button
            type="button"
            size="lg"
            className="h-auto w-full py-5 text-base"
            aria-expanded={formOpen}
            aria-controls="prayer-wall-form"
            onClick={() => setFormOpen((open) => !open)}
          >
            {config.formTitle}
          </Button>
          {formOpen && (
            <div id="prayer-wall-form" className="mt-6 border border-secondary p-6 @md:p-8">
              <RequestForm
                recaptchaSiteKey={config.recaptchaSiteKey}
                signedIn={signedIn}
                identityName={identityQuery.data?.data.name}
                identityLoading={identityQuery.isLoading}
              />
            </div>
          )}
        </section>
      )}

      {config.showFeed && (
        <section>
          <div
            ref={feedTopRef}
            className="scroll-mt-4 bg-surface-dark p-5 font-sans text-lg text-surface-dark-fg"
          >
            <h2>{config.feedTitle}</h2>
          </div>

          {feedQuery.isLoading ? (
            <div className="mt-6">
              <LoadingState count={config.perPage} />
            </div>
          ) : feedQuery.isError ? (
            <div className="mt-6">
              <MessageState>
                Unable to load the prayer wall right now. Please try again later.
              </MessageState>
            </div>
          ) : requests.length === 0 ? (
            <div className="mt-6">
              <MessageState>
                There are no prayer requests to show yet. Be the first to share one.
              </MessageState>
            </div>
          ) : (
            <>
              <FeedPager page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              <ul className="grid gap-8">
                {requests.map((request) => (
                  <PrayerCard
                    key={request.id}
                    request={request}
                    prayed={prayedIds.has(request.id)}
                    prayedCount={prayedCounts[request.id]}
                    pending={recordPrayer.isPending && recordPrayer.variables === request.id}
                    onPray={handlePray}
                  />
                ))}
              </ul>
              <FeedPager page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
