import * as React from 'react';
import type { AuthProvider } from '@perimeter/auth';
import {
  ApiError,
  useRegistrationEvent,
  useRegistrationQuote,
  useRegistrationRoster,
  useSubmitRegistration,
  type QuotedRegistration,
  type RegistrationQuote,
} from '@perimeter/api-hooks';
import { getRecaptchaToken, loadRecaptchaV3 } from '@perimeter/widget-runtime';
import { Skeleton } from '@perimeter/ui/skeleton';
import type { EventRegistrationConfig } from './types';
import { RECAPTCHA_ACTION } from './types';
import { EventDetails } from './components/EventDetails';
import { SectionCard } from './components/SectionCard';
import { RegistrantEditor } from './components/RegistrantEditor';
import { GuestContactForm, SignedInContactForm } from './components/PurchaserForm';
import { ReviewPanel } from './components/ReviewPanel';
import {
  ExternalRegistrationNotice,
  MessageState,
  PendingInvoiceNotice,
  SignInNotice,
} from './components/Notices';
import {
  attendeeIdentity,
  buildPlan,
  draftReducer,
  EMPTY_DRAFT,
  newLocalId,
  type DraftRegistration,
} from './lib/draft';
import { buildCheckoutUrl, readPageContext } from './lib/page-url';

export interface AppProps {
  config: EventRegistrationConfig;
  auth: AuthProvider;
}

const PRODUCTION_API = 'https://api.perimeter.org';

function apiBase(config: EventRegistrationConfig): string {
  if (config.apiUrl) return config.apiUrl.replace(/\/$/, '');
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL)
      return String(import.meta.env.VITE_API_URL).replace(/\/$/, '');
    if (import.meta.env.DEV) return '';
  }
  return PRODUCTION_API;
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="grid gap-4" aria-busy="true">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/**
 * The household registration page for one parent event: details on top,
 * one card per registration section, the purchaser's contact block, and the
 * running total with the submit that hands off to the native checkout.
 *
 * Auth is `optional`: the details are public; the roster and "add a family
 * member" need the MP session the host page's login widget provides; a
 * visitor may register themself when nothing forces login.
 */
export function App({ config, auth }: AppProps): React.JSX.Element {
  const page = React.useMemo(
    () => readPageContext(config.idParam, config.eventId),
    [config.idParam, config.eventId],
  );

  // The MP login widget writes its token after this widget mounts — watch it.
  const [signedIn, setSignedIn] = React.useState(() => auth.isAuthenticated());
  React.useEffect(() => auth.onChange(() => setSignedIn(auth.isAuthenticated())), [auth]);

  const eventQuery = useRegistrationEvent(page.eventId, { pageUrl: page.pageUrl, signedIn });
  const event = eventQuery.data?.data ?? null;

  const rosterQuery = useRegistrationRoster(page.eventId, {
    enabled: signedIn && event !== null && event.viewable && event.registrationOpen,
  });
  const roster = rosterQuery.data?.data ?? null;

  const [draft, dispatch] = React.useReducer(draftReducer, EMPTY_DRAFT);
  const [dismissedPendingInvoice, setDismissedPendingInvoice] = React.useState(false);

  // Pre-fill the signed-in purchaser's contact block once the roster arrives.
  React.useEffect(() => {
    if (!roster) return;
    dispatch({
      type: 'prefill-contact',
      contact: {
        email: roster.viewer.email ?? '',
        phone: roster.viewer.phone ?? '',
        address: {
          line1: roster.viewer.address?.line1 ?? '',
          line2: roster.viewer.address?.line2 ?? '',
          city: roster.viewer.address?.city ?? '',
          state: roster.viewer.address?.state ?? '',
          postalCode: roster.viewer.address?.postalCode ?? '',
        },
      },
    });
  }, [roster]);

  // ── Quote: the server prices the draft whenever it changes ────────────
  const quoteMutation = useRegistrationQuote(page.eventId);
  const [quote, setQuote] = React.useState<RegistrationQuote | null>(null);
  const plan = React.useMemo(() => buildPlan(draft, signedIn), [draft, signedIn]);
  const planKey = JSON.stringify(plan);
  // The mutation object is recreated per render; the effect below must not
  // re-run for that, only when the plan itself changes.
  const quoteRef = React.useRef(quoteMutation.mutate);
  quoteRef.current = quoteMutation.mutate;
  const quoteEnabled =
    draft.registrations.length > 0 &&
    event !== null &&
    (signedIn ||
      (draft.guest.firstName.trim() &&
        draft.guest.lastName.trim() &&
        draft.guest.email.trim() &&
        draft.guest.phone.trim()));

  React.useEffect(() => {
    if (!quoteEnabled) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(() => {
      quoteRef.current(plan, { onSuccess: (r) => setQuote(r.data) });
    }, 350);
    return () => clearTimeout(timer);
  }, [plan, quoteEnabled]);

  // ── Submit ────────────────────────────────────────────────────────────
  const submitMutation = useSubmitRegistration(page.eventId);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const idempotencyKeyRef = React.useRef<string>(newLocalId());
  // A new key whenever the plan changes; the same key across retries of one plan.
  React.useEffect(() => {
    idempotencyKeyRef.current = newLocalId();
  }, [planKey]);

  React.useEffect(() => {
    if (!signedIn && config.recaptchaSiteKey)
      void loadRecaptchaV3(config.recaptchaSiteKey).catch(() => {});
  }, [signedIn, config.recaptchaSiteKey]);

  async function handleSubmit(): Promise<void> {
    if (!quote || !quote.submittable) return;
    setSubmitError(null);

    let captchaToken: string | undefined;
    if (!signedIn) {
      try {
        captchaToken = await getRecaptchaToken(config.recaptchaSiteKey, RECAPTCHA_ACTION);
      } catch {
        setSubmitError('Could not verify your request. Please refresh and try again.');
        return;
      }
    }

    submitMutation.mutate(
      {
        idempotencyKey: idempotencyKeyRef.current,
        body: {
          ...plan,
          ...(captchaToken ? { captchaToken } : {}),
          dryRun: false,
          expectedQuoteHash: quote.quoteHash,
          checkout: { url: config.checkoutUrl, invoiceParam: config.invoiceParam },
        },
      },
      {
        onSuccess: (result) => {
          if (result.data.dryRun) return;
          window.location.assign(result.data.checkoutUrl);
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            if (error.status === 409) {
              setSubmitError(
                `${error.message} The total has been refreshed — please review and try again.`,
              );
              quoteMutation.mutate(plan, { onSuccess: (r) => setQuote(r.data) });
              return;
            }
            setSubmitError(error.message);
            return;
          }
          setSubmitError('Something went wrong saving your registration. Please try again.');
        },
      },
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (page.eventId === null) {
    return (
      <div className="@container p-4 text-left">
        <MessageState>
          No event selected. Open this page from an event's Register link.
        </MessageState>
      </div>
    );
  }
  if (eventQuery.isLoading) {
    return (
      <div className="@container p-4 text-left">
        <LoadingState />
      </div>
    );
  }
  if (eventQuery.isError || !event) {
    const apiError = eventQuery.error instanceof ApiError ? eventQuery.error : null;
    // A presented-but-rejected token (expired since the host page stored it) is
    // a sign-in problem, not an outage; the query re-keys on signedIn, so a
    // fresh login from the host page refetches on its own.
    const message =
      apiError?.status === 404
        ? 'That event could not be found.'
        : apiError?.isAuthError
          ? 'Your sign-in has expired. Please sign in again using the login link at the top of the page.'
          : 'Unable to load this event right now. Please try again later.';
    return (
      <div className="@container p-4 text-left">
        <MessageState>{message}</MessageState>
      </div>
    );
  }
  if (!event.viewable) {
    return (
      <div className="@container p-4 text-left">
        <MessageState>This event is not available to view.</MessageState>
      </div>
    );
  }

  const imageUrl = event.imageUrl ? `${apiBase(config)}${event.imageUrl}` : null;
  const isGuest = !signedIn;
  // A guest is one adult with no household: only a section open to anyone (or
  // to heads of household) that is not children-only can take them.
  const guestHasASection = event.sections.some(
    (s) =>
      s.open &&
      !s.event.minorRegistration &&
      (s.showHouseholdPositionId === null || s.showHouseholdPositionId === 1),
  );
  const guestAllowed = event.viewer.canGuestRegister && guestHasASection;
  const signInReason = event.viewer.loginRequired
    ? 'login_required'
    : guestAllowed
      ? 'guest_allowed'
      : 'household_only';
  const canRegister = event.registrationOpen && (signedIn || guestAllowed);
  const guestName = `${draft.guest.firstName} ${draft.guest.lastName}`.trim();
  const showPendingInvoice = page.pendingInvoiceGuid !== null && !dismissedPendingInvoice;

  const quotedByLocalId = new Map<string, QuotedRegistration>();
  if (quote) {
    quote.registrations.forEach((q) => {
      const local = draft.registrations[q.registrationIndex];
      if (local) quotedByLocalId.set(local.localId, q);
    });
  }
  const problemsByLocalId = new Map<string, RegistrationQuote['problems']>();
  for (const p of quote?.problems ?? []) {
    if (p.registrationIndex === null) continue;
    const local = draft.registrations[p.registrationIndex];
    if (!local) continue;
    problemsByLocalId.set(local.localId, [...(problemsByLocalId.get(local.localId) ?? []), p]);
  }

  const identitiesByEvent = new Map<number, Set<string>>();
  for (const r of draft.registrations) {
    const section = event.sections.find((s) => s.key === r.sectionKey);
    if (!section) continue;
    const set = identitiesByEvent.get(section.event.eventId) ?? new Set<string>();
    set.add(attendeeIdentity(r.attendee));
    identitiesByEvent.set(section.event.eventId, set);
  }

  const depositAvailable = event.sections.some((s) => (s.product?.depositPrice ?? 0) > 0);
  const addressRequired = quote?.addressRequired ?? false;

  return (
    <div className="@container grid gap-8 p-4 text-left">
      <EventDetails
        event={event}
        imageUrl={imageUrl}
        fallbackImageUrl={config.defaultImageUrl}
        showMap={config.showMap}
        returnUrl={config.returnUrl}
      />

      {event.cancelled ? (
        <MessageState>This event has been cancelled.</MessageState>
      ) : event.externalRegistrationUrl ? (
        <ExternalRegistrationNotice href={event.externalRegistrationUrl} />
      ) : !event.registrationOpen ? (
        <MessageState>Registration is not open for this event.</MessageState>
      ) : showPendingInvoice && page.pendingInvoiceGuid ? (
        <PendingInvoiceNotice
          checkoutHref={buildCheckoutUrl(
            config.checkoutUrl,
            config.invoiceParam,
            page.pendingInvoiceGuid,
          )}
          onStartOver={() => setDismissedPendingInvoice(true)}
        />
      ) : (
        <>
          {isGuest && <SignInNotice reason={signInReason} />}

          {canRegister && (
            <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_22rem] @3xl:items-start">
              <div className="grid gap-6">
                <section
                  className="grid gap-4 border border-border bg-bg p-4 @md:p-6"
                  aria-label="Your contact information"
                >
                  <h3 className="font-sans text-xl font-bold text-fg">Your information</h3>
                  {signedIn ? (
                    rosterQuery.isLoading ? (
                      <Skeleton className="h-24 w-full" />
                    ) : rosterQuery.isError ? (
                      <p className="font-sans text-sm text-destructive" role="alert">
                        {rosterQuery.error instanceof ApiError && rosterQuery.error.isAuthError
                          ? 'Your session has expired. Please sign in again.'
                          : 'Unable to load your household right now.'}
                      </p>
                    ) : roster ? (
                      <SignedInContactForm
                        viewerName={`${roster.viewer.firstName} ${roster.viewer.lastName}`.trim()}
                        contact={draft.contact}
                        addressRequired={addressRequired}
                        onChange={(contact) => dispatch({ type: 'set-contact', contact })}
                      />
                    ) : null
                  ) : (
                    <GuestContactForm
                      guest={draft.guest}
                      addressRequired={addressRequired}
                      onChange={(guest) => dispatch({ type: 'set-guest', guest })}
                    />
                  )}
                </section>

                {event.sections.map((section) => {
                  const inSection = draft.registrations.filter((r) => r.sectionKey === section.key);
                  const editingHere =
                    draft.editing.kind === 'new'
                      ? draft.editing.sectionKey === section.key
                      : draft.editing.kind === 'existing'
                        ? inSection.some(
                            (r) => r.localId === (draft.editing as { localId: string }).localId,
                          )
                        : false;
                  const existing =
                    draft.editing.kind === 'existing'
                      ? (inSection.find(
                          (r) => r.localId === (draft.editing as { localId: string }).localId,
                        ) ?? null)
                      : null;
                  // A guest is one person: once they're in a section, no more adds there.
                  const canAdd = signedIn ? roster !== null : inSection.length === 0;
                  return (
                    <SectionCard
                      key={section.key}
                      section={section}
                      timeZone={event.timeZone}
                      registrations={inSection}
                      quotedByLocalId={quotedByLocalId}
                      canAdd={canAdd && draft.editing.kind === 'none'}
                      onAdd={() => dispatch({ type: 'start-new', sectionKey: section.key })}
                      onEdit={(localId) => dispatch({ type: 'edit', localId })}
                      onRemove={(localId) => dispatch({ type: 'remove', localId })}
                      editor={
                        editingHere ? (
                          <RegistrantEditor
                            key={existing?.localId ?? 'new'}
                            section={section}
                            existing={existing}
                            members={roster?.members ?? []}
                            takenIdentities={
                              identitiesByEvent.get(section.event.eventId) ?? new Set()
                            }
                            mode={signedIn ? 'household' : 'guest'}
                            guestName={guestName}
                            timeZone={event.timeZone}
                            problems={
                              existing ? (problemsByLocalId.get(existing.localId) ?? []) : []
                            }
                            onSave={(registration: DraftRegistration) =>
                              dispatch({ type: 'save', registration })
                            }
                            onCancel={() => dispatch({ type: 'cancel-edit' })}
                          />
                        ) : null
                      }
                    />
                  );
                })}
              </div>

              <div className="@3xl:sticky @3xl:top-4">
                <ReviewPanel
                  quote={quote}
                  quoting={quoteMutation.isPending}
                  quoteError={
                    quoteMutation.isError
                      ? quoteMutation.error instanceof ApiError
                        ? quoteMutation.error.message
                        : 'Unable to price your registration right now.'
                      : null
                  }
                  registrationCount={draft.registrations.length}
                  depositAvailable={depositAvailable}
                  payDeposit={draft.payDeposit}
                  onPayDepositChange={(payDeposit) =>
                    dispatch({ type: 'set-pay-deposit', payDeposit })
                  }
                  submitting={submitMutation.isPending}
                  submitError={submitError}
                  canSubmit={quote !== null && quote.submittable && draft.editing.kind === 'none'}
                  isGuest={isGuest}
                  onSubmit={() => void handleSubmit()}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
