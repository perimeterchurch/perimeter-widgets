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
  type RegistrationRoster,
  type RegistrationSubmitResult,
} from '@perimeter/api-hooks';
import { getRecaptchaToken, loadRecaptchaV3 } from '@perimeter/widget-runtime';
import { Skeleton } from '@perimeter/ui/skeleton';
import type { EventRegistrationConfig } from './types';
import { RECAPTCHA_ACTION } from './types';
import { EventDetails } from './components/EventDetails';
import { SectionCard } from './components/SectionCard';
import { RegistrantEditor } from './components/RegistrantEditor';
import { GuestContactForm, SignedInContactForm } from './components/PurchaserForm';
import { ContactSummary } from './components/ContactSummary';
import { RegistrationComplete } from './components/RegistrationComplete';
import { ReviewPanel, submitLabel } from './components/ReviewPanel';
import { ReviewBody } from './components/ReviewBody';
import { SummaryBar } from './components/SummaryBar';
import { StickyCta, type CtaState } from './components/StickyCta';
import { EditorSheet } from './components/EditorSheet';
import { useContainerBreakpoint } from './hooks/use-container-breakpoint';
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
import { eventIsFree } from './lib/format';
import { groupSections } from './lib/groups';

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

/** The signed-in purchaser's contact block, as MP holds it. */
function contactFromRoster(roster: RegistrationRoster) {
  return {
    email: roster.viewer.email ?? '',
    phone: roster.viewer.phone ?? '',
    address: {
      line1: roster.viewer.address?.line1 ?? '',
      line2: roster.viewer.address?.line2 ?? '',
      city: roster.viewer.address?.city ?? '',
      state: roster.viewer.address?.state ?? '',
      postalCode: roster.viewer.address?.postalCode ?? '',
    },
  };
}

type CompletedSubmit = {
  result: Extract<RegistrationSubmitResult, { dryRun: false }>;
  /** Captured before the draft is cleared, so the guest's email survives the reset. */
  email: string;
};

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

  // Phone/tablet get the sticky summary bar, the bottom CTA and the sheet
  // editor; desktop keeps the review column and the inline editor.
  const { ref: rootRef, breakpoint } = useContainerBreakpoint();
  const compact = breakpoint !== 'desktop';
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  // The contact line opens into fields on request, or on its own when
  // something the invoice needs is missing.
  const [contactOpen, setContactOpen] = React.useState(false);
  const contactRef = React.useRef<HTMLElement>(null);

  // Pre-fill the signed-in purchaser's contact block once the roster arrives.
  React.useEffect(() => {
    if (!roster) return;
    dispatch({ type: 'prefill-contact', contact: contactFromRoster(roster) });
  }, [roster]);

  // A registration that owed nothing confirms in place instead of going to checkout.
  const [completed, setCompleted] = React.useState<CompletedSubmit | null>(null);

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
          if (result.data.invoiceTotal === 0) {
            // Nothing to pay: the checkout page would only show a $0 invoice.
            setCompleted({
              result: result.data,
              email: signedIn ? draft.contact.email : draft.guest.email,
            });
            setQuote(null);
            dispatch({ type: 'reset' });
            if (roster) dispatch({ type: 'prefill-contact', contact: contactFromRoster(roster) });
            void eventQuery.refetch?.();
            void rosterQuery.refetch?.();
            return;
          }
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
  const guestContactComplete = Boolean(
    draft.guest.firstName.trim() &&
    draft.guest.lastName.trim() &&
    draft.guest.email.trim() &&
    draft.guest.phone.trim(),
  );
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
  // On an all-free event "Free" badges and $0.00 amounts are noise.
  const showPrices = !eventIsFree(event);
  const addressRequired = quote?.addressRequired ?? false;
  const sections = [...event.sections].sort((a, b) => a.position - b.position);
  // Headings only where staff set bp_Related_Events.Section_Group; otherwise one plain list.
  const sectionGroups = groupSections(sections);

  // ── The editor: inline in its card on desktop, in the sheet on phones ──
  const editing = draft.editing;
  const editingExisting =
    editing.kind === 'existing'
      ? (draft.registrations.find((r) => r.localId === editing.localId) ?? null)
      : null;
  const editingSectionKey =
    editing.kind === 'new' ? editing.sectionKey : (editingExisting?.sectionKey ?? null);
  const editingSection =
    editingSectionKey !== null ? (sections.find((s) => s.key === editingSectionKey) ?? null) : null;

  const renderEditor = (
    section: (typeof sections)[number],
    embedded: boolean,
  ): React.JSX.Element => (
    <RegistrantEditor
      key={`${section.key}:${editingExisting?.localId ?? 'new'}`}
      section={section}
      existing={editingExisting}
      members={roster?.members ?? []}
      takenIdentities={identitiesByEvent.get(section.event.eventId) ?? new Set()}
      mode={signedIn ? 'household' : 'guest'}
      guestName={guestName}
      guest={signedIn ? undefined : draft.guest}
      onGuestChange={signedIn ? undefined : (guest) => dispatch({ type: 'set-guest', guest })}
      addressRequired={addressRequired}
      timeZone={event.timeZone}
      showPrices={showPrices}
      embedded={embedded}
      framed={false}
      problems={editingExisting ? (problemsByLocalId.get(editingExisting.localId) ?? []) : []}
      onSave={(registrations: DraftRegistration[]) =>
        dispatch({ type: 'save-many', registrations })
      }
      onCancel={() => dispatch({ type: 'cancel-edit' })}
    />
  );

  // ── Review / submit state shared by the desktop column and the phone bars ──
  const quoteError = quoteMutation.isError
    ? quoteMutation.error instanceof ApiError
      ? quoteMutation.error.message
      : 'Unable to price your registration right now.'
    : null;
  const problemCount = quote?.problems.length ?? 0;
  const canSubmit = quote !== null && quote.submittable && editing.kind === 'none';
  const reviewBody = {
    quote,
    quoting: quoteMutation.isPending,
    quoteError,
    registrationCount: draft.registrations.length,
    depositAvailable,
    showPrices,
    payDeposit: draft.payDeposit,
    onPayDepositChange: (payDeposit: boolean) => dispatch({ type: 'set-pay-deposit', payDeposit }),
  };

  const sectionImageSources = (section: (typeof sections)[number]) => [
    section.isParentEvent ? null : `${apiBase(config)}/api/event-image/${section.event.eventId}`,
    imageUrl,
    config.defaultImageUrl,
  ];

  // ── Contact for the registration: one line unless something is missing ──
  const viewer = roster?.viewer ?? null;
  const same = (a: string, b: string | null | undefined) => a.trim() === (b ?? '').trim();
  const contactDirty =
    viewer !== null &&
    !(
      same(draft.contact.email, viewer.email) &&
      same(draft.contact.phone, viewer.phone) &&
      same(draft.contact.address.line1, viewer.address?.line1) &&
      same(draft.contact.address.line2, viewer.address?.line2) &&
      same(draft.contact.address.city, viewer.address?.city) &&
      same(draft.contact.address.state, viewer.address?.state) &&
      same(draft.contact.address.postalCode, viewer.address?.postalCode)
    );
  const contactMissing = signedIn
    ? roster !== null && (!draft.contact.email.trim() || !draft.contact.phone.trim())
    : !guestContactComplete;
  const contactCanCollapse =
    !contactMissing && !addressRequired && (signedIn ? roster !== null : true);
  const contactEditing = contactOpen || !contactCanCollapse;
  // Guests give their details in the editor; the line appears once they have added someone.
  const showContact = signedIn || draft.registrations.length > 0 || contactOpen;
  const contactName = signedIn
    ? viewer
      ? `${viewer.firstName} ${viewer.lastName}`.trim()
      : ''
    : guestName;

  let ctaState: CtaState;
  let ctaLabel: string;
  if (draft.registrations.length === 0) {
    ctaState = 'empty';
    ctaLabel = 'Add someone to continue';
  } else if (contactMissing) {
    ctaState = 'needs-contact';
    ctaLabel = isGuest ? 'Continue to your details' : 'Add your contact details';
  } else if (!quote) {
    ctaState = 'quoting';
    ctaLabel = 'Checking…';
  } else if (!quote.submittable) {
    ctaState = 'blocked';
    ctaLabel = submitLabel(quote);
  } else {
    ctaState = 'ready';
    ctaLabel = submitLabel(quote);
  }

  /** The contact fields live in the review: open it (and them), then focus the first gap. */
  const goToContactForm = (): void => {
    setSummaryOpen(true);
    setContactOpen(true);
    // The fields mount on the next render.
    setTimeout(() => {
      const el = contactRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const inputs = Array.from(
        el.querySelectorAll<HTMLInputElement>('input:not([type="checkbox"])'),
      );
      (inputs.find((i) => i.value.trim() === '') ?? inputs[0])?.focus();
    }, 0);
  };

  const contactBlock = showContact ? (
    <ContactSummary
      ref={contactRef}
      name={contactName}
      email={signedIn ? draft.contact.email : draft.guest.email}
      phone={signedIn ? draft.contact.phone : draft.guest.phone}
      editing={contactEditing}
      canCollapse={contactCanCollapse}
      onEdit={() => setContactOpen(true)}
      onDone={() => setContactOpen(false)}
    >
      {signedIn ? (
        rosterQuery.isLoading ? (
          <Skeleton className="h-6 w-2/3" />
        ) : rosterQuery.isError ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {rosterQuery.error instanceof ApiError && rosterQuery.error.isAuthError
              ? 'Your session has expired. Please sign in again.'
              : 'Unable to load your household right now.'}
          </p>
        ) : roster ? (
          <SignedInContactForm
            contact={draft.contact}
            addressRequired={addressRequired}
            dirty={contactDirty}
            onChange={(contact) =>
              dispatch({
                type: 'set-contact',
                contact: {
                  ...contact,
                  // The first real edit opts into writing the record back; the
                  // checkbox that then appears lets them opt out.
                  ...(contact.updateMyRecord === undefined && !contactDirty
                    ? { updateMyRecord: true }
                    : {}),
                },
              })
            }
          />
        ) : null
      ) : (
        <GuestContactForm
          guest={draft.guest}
          addressRequired={addressRequired}
          onChange={(guest) => dispatch({ type: 'set-guest', guest })}
        />
      )}
    </ContactSummary>
  ) : null;

  return (
    <>
      <div ref={rootRef} className="@container grid gap-6 p-4 text-left @min-[768px]:gap-8">
        <EventDetails
          event={event}
          imageUrl={imageUrl}
          fallbackImageUrl={config.defaultImageUrl}
          showMap={config.showMap}
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

            {completed ? (
              <RegistrationComplete
                event={event}
                result={completed.result}
                contactEmail={completed.email}
                returnUrl={config.returnUrl}
                onRegisterMore={() => setCompleted(null)}
              />
            ) : (
              canRegister && (
                <>
                  {compact && (
                    <SummaryBar
                      count={draft.registrations.length}
                      total={quote?.invoiceTotal ?? null}
                      quoting={quoteMutation.isPending}
                      showPrices={showPrices}
                      problemCount={problemCount}
                      needsContact={contactMissing && draft.registrations.length > 0}
                      open={summaryOpen}
                      onToggle={() => setSummaryOpen((o) => !o)}
                      topOffset={config.stickyTopOffset}
                    >
                      <ReviewBody {...reviewBody} />
                      {contactBlock}
                    </SummaryBar>
                  )}

                  <div className="grid gap-6 @min-[768px]:grid-cols-[minmax(0,1fr)_22rem] @min-[768px]:items-start">
                    <div className="grid gap-6">
                      {sectionGroups.map((group, gi) => {
                        const cards = group.sections.map((section) => {
                          const inSection = draft.registrations.filter(
                            (r) => r.sectionKey === section.key,
                          );
                          const editingHere = editingSection?.key === section.key;
                          // A guest is one person: once they're in a section, no more adds there.
                          const canAdd = signedIn ? roster !== null : inSection.length === 0;
                          return (
                            <SectionCard
                              key={section.key}
                              section={section}
                              timeZone={event.timeZone}
                              registrations={inSection}
                              quotedByLocalId={quotedByLocalId}
                              showPrices={showPrices}
                              canAdd={canAdd && (compact || editing.kind === 'none')}
                              imageSources={sectionImageSources(section)}
                              onAdd={() => dispatch({ type: 'start-new', sectionKey: section.key })}
                              onEdit={(localId) => dispatch({ type: 'edit', localId })}
                              onRemove={(localId) => dispatch({ type: 'remove', localId })}
                              editor={!compact && editingHere ? renderEditor(section, false) : null}
                            />
                          );
                        });
                        const grid = (
                          <div className="grid gap-4 @min-[1024px]:grid-cols-2 @min-[1024px]:items-start">
                            {cards}
                          </div>
                        );
                        if (group.label === null)
                          return <React.Fragment key="ungrouped">{grid}</React.Fragment>;
                        const headingId = `section-group-${gi}`;
                        return (
                          <div
                            key={group.label}
                            role="group"
                            aria-labelledby={headingId}
                            // A tinted band per group: bleeds to the widget's edges on
                            // phones, sits inside the column from 768px.
                            className="-mx-4 grid gap-3 border-y border-border bg-muted/40 px-4 py-4 @min-[768px]:mx-0 @min-[768px]:border @min-[768px]:p-5"
                            data-slot="section-group"
                          >
                            <h2 id={headingId} className="font-sans text-lg font-bold text-fg">
                              {group.label}
                            </h2>
                            {grid}
                          </div>
                        );
                      })}
                    </div>

                    {!compact && (
                      <div className="@min-[768px]:sticky @min-[768px]:top-4">
                        <ReviewPanel
                          {...reviewBody}
                          contact={contactBlock}
                          submitting={submitMutation.isPending}
                          submitError={submitError}
                          canSubmit={canSubmit}
                          isGuest={isGuest}
                          onSubmit={() => void handleSubmit()}
                        />
                      </div>
                    )}
                  </div>

                  {compact && (
                    <StickyCta
                      state={ctaState}
                      label={ctaLabel}
                      problemCount={problemCount}
                      submitting={submitMutation.isPending}
                      submitError={submitError}
                      isGuest={isGuest}
                      onShowProblems={() => setSummaryOpen(true)}
                      onPrimary={() => {
                        if (ctaState === 'needs-contact') goToContactForm();
                        else if (ctaState === 'ready') void handleSubmit();
                      }}
                    />
                  )}
                </>
              )
            )}
          </>
        )}
      </div>

      {compact && canRegister && !completed && editingSection && (
        <EditorSheet
          title={`${editingExisting ? 'Edit registration' : 'New registration'} — ${editingSection.displayName}`}
          titleId={`editor-${editingSection.key}-title`}
          onClose={() => dispatch({ type: 'cancel-edit' })}
        >
          {renderEditor(editingSection, true)}
        </EditorSheet>
      )}
    </>
  );
}
