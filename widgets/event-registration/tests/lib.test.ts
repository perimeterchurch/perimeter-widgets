import { describe, expect, it, vi } from 'vitest';
import {
  attendeeIdentity,
  buildPlan,
  draftReducer,
  EMPTY_DRAFT,
  type DraftRegistration,
} from '../src/lib/draft';
import { buildCheckoutUrl, readPageContext, withoutQueryParams } from '../src/lib/page-url';
import { MPCheckoutClient, paymentPageUrl, resolveMPAppRoot } from '../src/lib/mp-checkout';
import {
  PENDING_PAYMENT_KEY,
  PENDING_PAYMENT_TTL_MS,
  clearPendingPayment,
  readPendingPayment,
  savePendingPayment,
} from '../src/lib/pending-payment';
import {
  cardPrice,
  formatEventRange,
  formatMoneyParts,
  formatPrice,
  htmlToText,
} from '../src/lib/format';
import { bucketFor } from '../src/lib/breakpoint';
import { groupSections } from '../src/lib/groups';
import { resolveRoom, roomRefusalText } from '../src/lib/placement';
import { eventsOverlap } from '../src/lib/overlap';
import { DateTime } from 'luxon';
import { familyNight } from './fixtures';

const reg = (over: Partial<DraftRegistration> = {}): DraftRegistration => ({
  localId: 'a',
  sectionKey: 'related:103',
  attendee: { kind: 'contact', contactId: 698112 },
  attendeeLabel: 'William Cano',
  options: [{ productOptionPriceId: 8004, quantity: 1 }],
  promoCode: 'early5',
  answers: [
    { formFieldId: 6001, response: '6th' },
    { formFieldId: 6002, response: '  ' },
  ],
  ...over,
});

describe('page context', () => {
  it('reads the event id from the configured query parameter and a pending invoice GUID', () => {
    const ctx = readPageContext(
      'id',
      undefined,
      'https://www.perimeter.org/family-registration/?id=900001&invoiceid=e8b7bf55-a16b-4ee9-a826-277d5d6ade43',
    );
    expect(ctx).toEqual({
      eventId: 900001,
      pendingInvoiceGuid: 'e8b7bf55-a16b-4ee9-a826-277d5d6ade43',
      paymentToken: null,
      pageUrl: 'https://www.perimeter.org/family-registration/',
    });
  });

  it("reads Online Giving's payment response token from the bare return URL", () => {
    const ctx = readPageContext(
      'id',
      undefined,
      'https://www.perimeter.org/family-registration/?token=abc.def',
    );
    expect(ctx.eventId).toBeNull();
    expect(ctx.paymentToken).toBe('abc.def');
    expect(ctx.pageUrl).toBe('https://www.perimeter.org/family-registration/');
    expect(readPageContext('id', 1, 'https://x.test/?token=').paymentToken).toBeNull();
  });

  it('drops named query parameters without leaving a dangling ?', () => {
    expect(withoutQueryParams('https://x.test/p/?token=abc', ['token'])).toBe('https://x.test/p/');
    expect(withoutQueryParams('https://x.test/p/?id=1&token=abc', ['token'])).toBe(
      'https://x.test/p/?id=1',
    );
    expect(withoutQueryParams('not a url', ['token'])).toBe('not a url');
  });

  it('prefers a pinned event id and ignores a malformed one', () => {
    expect(readPageContext('id', 42, 'https://x.test/?id=900001').eventId).toBe(42);
    expect(readPageContext('id', undefined, 'https://x.test/?id=abc').eventId).toBeNull();
    expect(readPageContext('eventID', undefined, 'https://x.test/?eventID=7').eventId).toBe(7);
  });

  it('builds the checkout URL the native checkout widget expects', () => {
    expect(buildCheckoutUrl('https://www.perimeter.org/event-checkout/', 'id', 'abc-guid')).toBe(
      'https://www.perimeter.org/event-checkout/?id=abc-guid',
    );
    expect(buildCheckoutUrl('https://x.test/checkout?x=1', 'id', 'g')).toBe(
      'https://x.test/checkout?x=1&id=g',
    );
  });
});

describe('draft reducer', () => {
  it('adds, edits, and removes registrations and closes the editor', () => {
    let state = draftReducer(EMPTY_DRAFT, { type: 'start-new', sectionKey: 'related:103' });
    expect(state.editing).toEqual({ kind: 'new', sectionKey: 'related:103' });
    state = draftReducer(state, { type: 'save', registration: reg() });
    expect(state.registrations).toHaveLength(1);
    expect(state.editing.kind).toBe('none');
    state = draftReducer(state, { type: 'save', registration: reg({ promoCode: undefined }) });
    expect(state.registrations).toHaveLength(1);
    expect(state.registrations[0]?.promoCode).toBeUndefined();
    state = draftReducer(state, { type: 'edit', localId: 'a' });
    state = draftReducer(state, { type: 'remove', localId: 'a' });
    expect(state.registrations).toHaveLength(0);
    expect(state.editing.kind).toBe('none');
  });

  it('prefills the contact block only where the visitor has not typed', () => {
    let state = draftReducer(EMPTY_DRAFT, {
      type: 'set-contact',
      contact: { email: 'typed@example.com' },
    });
    state = draftReducer(state, {
      type: 'prefill-contact',
      contact: {
        email: 'mp@example.com',
        phone: '770-555-0000',
        address: { line1: '1 Main', line2: '', city: 'Duluth', state: 'GA', postalCode: '30097' },
      },
    });
    expect(state.contact.email).toBe('typed@example.com');
    expect(state.contact.phone).toBe('770-555-0000');
    expect(state.contact.address.city).toBe('Duluth');
  });
});

describe('plan projection', () => {
  it('builds a session plan, trims promo codes, and drops blank answers', () => {
    const state = draftReducer(EMPTY_DRAFT, { type: 'save', registration: reg() });
    const plan = buildPlan(state, true);
    expect(plan.purchaser).toEqual({ kind: 'session' });
    expect(plan.registrations[0]).toMatchObject({
      sectionKey: 'related:103',
      promoCode: 'early5',
      answers: [{ formFieldId: 6001, response: '6th' }],
    });
    expect(plan.updateMyRecord).toBe(false);
  });

  it('builds a guest plan with the address only when a street is given', () => {
    let state = draftReducer(EMPTY_DRAFT, {
      type: 'save',
      registration: reg({ attendee: { kind: 'purchaser' } }),
    });
    state = draftReducer(state, {
      type: 'set-guest',
      guest: {
        firstName: ' Sam ',
        lastName: 'Guest',
        email: 'sam@example.com',
        phone: '7705550000',
      },
    });
    const plan = buildPlan(state, false);
    expect(plan.purchaser).toEqual({
      kind: 'guest',
      firstName: 'Sam',
      lastName: 'Guest',
      email: 'sam@example.com',
      phone: '7705550000',
      address: undefined,
    });
    expect(plan.contact).toBeUndefined();
  });

  it('identifies the same person across sections', () => {
    expect(attendeeIdentity({ kind: 'contact', contactId: 5 })).toBe('c5');
    expect(attendeeIdentity({ kind: 'purchaser' })).toBe('purchaser');
    expect(
      attendeeIdentity({
        kind: 'new',
        firstName: 'Max',
        lastName: 'Cano',
        householdPositionId: 2,
        dateOfBirth: '2017-05-16',
      }),
    ).toBe('nmax|cano|2017-05-16');
  });
});

describe('formatting', () => {
  it('shows Free for zero and money otherwise', () => {
    expect(formatPrice(0)).toBe('Free');
    expect(formatPrice(12.5)).toBe('$12.50');
  });

  it('advertises the least a person pays, not the base price', () => {
    const p = (price: number, over: Partial<{ hidden: boolean; isPromo: boolean }> = {}) => ({
      price,
      hidden: false,
      isPromo: false,
      ...over,
    });
    // $0 base, required $12 choice (a pizza-style product on a section): from $12.
    expect(
      cardPrice({ basePrice: 0, groups: [{ required: true, prices: [p(12), p(12)] }] }),
    ).toEqual({ kind: 'amount', amount: 12, from: false });
    // Required group with a $0 choice adds nothing; the paid choice makes it "from".
    expect(
      cardPrice({ basePrice: 10, groups: [{ required: true, prices: [p(0), p(5)] }] }),
    ).toEqual({ kind: 'amount', amount: 10, from: true });
    // Only optional paid add-ons: still free to attend, but say so.
    expect(
      cardPrice({ basePrice: 0, groups: [{ required: false, prices: [p(0), p(15)] }] }),
    ).toEqual({ kind: 'free', paidOptions: true });
    // Hidden and promo rows are not offered and do not count.
    expect(
      cardPrice({
        basePrice: 0,
        groups: [
          { required: true, prices: [p(0), p(40, { hidden: true }), p(-5, { isPromo: true })] },
        ],
      }),
    ).toEqual({ kind: 'free', paidOptions: false });
    // Plain paid base with no options: exact, per person.
    expect(cardPrice({ basePrice: 10, groups: [] })).toEqual({
      kind: 'amount',
      amount: 10,
      from: false,
    });
  });

  it('formats an event range in the congregation zone with the zone label', () => {
    const text = formatEventRange('2026-09-27T18:00:00', '2026-09-27T20:00:00', 'America/New_York');
    expect(text).toBe('Sun, Sep 27, 2026, 6:00 PM – 8:00 PM EDT');
  });
});

describe('mobile layout helpers', () => {
  it('buckets a container width at 480 and 768', () => {
    expect(bucketFor(343)).toBe('phone');
    expect(bucketFor(479)).toBe('phone');
    expect(bucketFor(480)).toBe('tablet');
    expect(bucketFor(767)).toBe('tablet');
    expect(bucketFor(768)).toBe('desktop');
  });

  it('splits a price into whole dollars and cents', () => {
    expect(formatMoneyParts(10)).toEqual({ whole: '$10', cents: '00' });
    expect(formatMoneyParts(12.5)).toEqual({ whole: '$12', cents: '50' });
    expect(formatMoneyParts(1234.56)).toEqual({ whole: '$1,234', cents: '56' });
  });

  it('collapses staff HTML to one line of text', () => {
    expect(htmlToText('<p>Bring a <b>friend</b>.</p> <p>Doors open at 5.</p>')).toBe(
      'Bring a friend. Doors open at 5.',
    );
    expect(htmlToText(null)).toBe('');
    expect(htmlToText('   ')).toBe('');
  });

  it('groups sections only under headings staff set, ungrouped first, groups by lowest position', () => {
    const [a, b, c] = familyNight.sections;
    const sections = [
      { ...c!, position: 1, sectionGroup: 'Kids' },
      { ...a!, position: 2, sectionGroup: null },
      { ...b!, position: 3, sectionGroup: ' kids ' },
      { ...a!, key: 'related:200', position: 4, sectionGroup: 'Adults' },
    ];
    const groups = groupSections(sections);
    expect(groups.map((g) => g.label)).toEqual([null, 'Kids', 'Adults']);
    expect(groups.map((g) => g.sections.map((s) => s.key))).toEqual([
      ['related:101'],
      ['related:104', 'related:103'],
      ['related:200'],
    ]);
  });

  it('yields one unlabelled run when no section has a group', () => {
    const groups = groupSections(familyNight.sections);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBeNull();
    expect(groups[0]?.sections).toHaveLength(3);
  });
});

describe('Event_Rooms placement mirror', () => {
  const START = DateTime.fromISO('2026-09-27T18:00:00', { zone: 'America/New_York' });
  const room = (
    groupId: number,
    groupName: string,
    min: number,
    max: number,
    over: Partial<{
      remaining: number | null;
      balancePriority: number | null;
      minGrade: number | null;
      maxGrade: number | null;
    }> = {},
  ) => ({
    groupId,
    groupName,
    roomId: 100 + groupId,
    roomName: `Room ${groupId}`,
    placement: {
      minAgeMonths: min,
      maxAgeMonths: max,
      minGrade: over.minGrade ?? null,
      maxGrade: over.maxGrade ?? null,
    },
    remaining: over.remaining ?? null,
    balancePriority: over.balancePriority ?? null,
  });
  const rooms = [
    room(1, 'SEC 0-1', 0, 12),
    room(2, 'SEC 1 year olds', 12, 24),
    room(3, 'SEC 2 year olds', 24, 36),
  ];

  it('places by months, asks for a birth date, refuses when nothing fits or the fit is full', () => {
    expect(resolveRoom(rooms, { dateOfBirth: '2025-03-01', grade: null }, START)).toMatchObject({
      kind: 'resolved',
      room: { groupName: 'SEC 1 year olds' },
    });
    expect(resolveRoom(rooms, { dateOfBirth: null, grade: null }, START)).toEqual({
      kind: 'ask',
      reason: 'needs_birth_date',
    });
    const none = resolveRoom(rooms, { dateOfBirth: '2017-05-16', grade: null }, START);
    expect(none).toMatchObject({ kind: 'refused', reason: 'no_room' });
    if (none.kind === 'refused')
      expect(roomRefusalText(none, 'Max')).toBe("No room fits Max's age for this session.");
    const full = resolveRoom(
      [room(2, 'SEC 1 year olds', 12, 24, { remaining: 0 })],
      { dateOfBirth: '2025-03-01', grade: null },
      START,
    );
    expect(full).toMatchObject({ kind: 'refused', reason: 'room_full' });
    if (full.kind === 'refused')
      expect(roomRefusalText(full, 'Sofia')).toBe('The SEC 1 year olds room is full.');
  });

  it('breaks a tie by seats left, then Balance_Priority', () => {
    const tie = [
      room(1, 'Blue', 12, 24, { remaining: 2, balancePriority: 1 }),
      room(2, 'Green', 12, 24, { remaining: 7, balancePriority: 2 }),
    ];
    expect(resolveRoom(tie, { dateOfBirth: '2025-03-01', grade: null }, START)).toMatchObject({
      room: { groupName: 'Green' },
    });
    const even = [
      room(1, 'Blue', 12, 24, { remaining: 5, balancePriority: 2 }),
      room(2, 'Green', 12, 24, { remaining: 5, balancePriority: 1 }),
    ];
    expect(resolveRoom(even, { dateOfBirth: '2025-03-01', grade: null }, START)).toMatchObject({
      room: { groupName: 'Green' },
    });
  });
});

describe('eventsOverlap', () => {
  const ev = (eventId: number, start: string, end: string) => ({
    eventId,
    startDate: `2026-11-01T${start}:00`,
    endDate: `2026-11-01T${end}:00`,
  });
  it('is true when the windows intersect and false when they only touch or are the same event', () => {
    expect(eventsOverlap(ev(1, '16:30', '18:00'), ev(2, '16:30', '18:00'))).toBe(true);
    expect(eventsOverlap(ev(1, '16:30', '18:00'), ev(2, '17:30', '19:00'))).toBe(true);
    expect(eventsOverlap(ev(1, '16:30', '18:00'), ev(2, '18:00', '19:00'))).toBe(false);
    expect(eventsOverlap(ev(1, '16:30', '18:00'), ev(1, '16:30', '18:00'))).toBe(false);
  });
});

describe('MP checkout client', () => {
  const ok = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  it('mints a payment token with the bearer token and MP cookies when signed in', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ token: 'signed.token' }));
    const client = new MPCheckoutClient('https://mp.example.org/widgets', () => 'tok', fetchImpl);
    const token = await client.buildPaymentRequestToken({
      invoiceGuid: 'e8b7bf55-a16b-4ee9-a826-277d5d6ade43',
      audienceUrl: 'https://perimeter.onlinegiving.org/mp/payments/',
      returnUrl: 'https://www.perimeter.org/family-registration/',
      amountToPay: 12.5,
      paymentOption: 'full',
    });
    expect(token).toBe('signed.token');
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const u = new URL(url);
    expect(u.pathname).toBe('/widgets/Api/CheckoutApi/BuildPaymentRequestToken');
    expect(Object.fromEntries(u.searchParams)).toEqual({
      invoiceId: 'e8b7bf55-a16b-4ee9-a826-277d5d6ade43',
      audienceUrl: 'https://perimeter.onlinegiving.org/mp/payments/',
      returnUrl: 'https://www.perimeter.org/family-registration/',
      amountToPay: '12.50',
      paymentOption: 'full',
    });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(init.credentials).toBe('include');
  });

  it('sends a guest request with neither a bearer token nor cookies, and fails on an empty token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ token: null }));
    const client = new MPCheckoutClient('https://mp.example.org/widgets', () => null, fetchImpl);
    await expect(
      client.buildPaymentRequestToken({
        invoiceGuid: 'g',
        audienceUrl: 'https://og.test/',
        returnUrl: 'https://x.test/',
        amountToPay: 1,
        paymentOption: 'full',
      }),
    ).rejects.toThrow(/no payment token/);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.credentials).toBeUndefined();
  });

  it("posts Online Giving's response token as form data with MP's CSRF header", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'csrf-1', expiresAfterUtc: '2099-01-01T00:00:00Z' }))
      .mockResolvedValueOnce(ok({ success: true, invoiceId: 'g' }));
    const client = new MPCheckoutClient('https://mp.example.org/widgets', () => 'tok', fetchImpl);
    const result = await client.processPaymentResponse('resp.token');
    expect(result).toEqual({ success: true, invoiceId: 'g' });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://mp.example.org/widgets/Home/CSRFToken');
    const [url, init] = fetchImpl.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('https://mp.example.org/widgets/Api/CheckoutApi/ProcessPaymentResponse');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('csrf-1');
    expect((init.body as FormData).get('text')).toBe('resp.token');
  });

  it('surfaces an HTTP failure as an error with its status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    const client = new MPCheckoutClient('https://mp.example.org/widgets', () => 'tok', fetchImpl);
    await expect(
      client.buildPaymentRequestToken({
        invoiceGuid: 'g',
        audienceUrl: 'https://og.test/',
        returnUrl: 'https://x.test/',
        amountToPay: 1,
        paymentOption: 'full',
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("builds Online Giving's page URL and resolves the app root from an override or the page's MP script", () => {
    expect(paymentPageUrl('https://perimeter.onlinegiving.org/mp/payments/', 'a b')).toBe(
      'https://perimeter.onlinegiving.org/mp/payments/?token=a%20b',
    );
    expect(paymentPageUrl('https://og.test/pay?x=1', 't')).toBe('https://og.test/pay?x=1&token=t');
    expect(resolveMPAppRoot('https://mp.example.org/widgets/')).toBe(
      'https://mp.example.org/widgets',
    );
    expect(resolveMPAppRoot(undefined)).toBeNull();
    const script = document.createElement('script');
    script.src = 'https://ministryplatform.perimeter.org/widgets/dist/UserLogin.js';
    document.head.appendChild(script);
    try {
      expect(resolveMPAppRoot(undefined)).toBe('https://ministryplatform.perimeter.org/widgets');
    } finally {
      script.remove();
    }
  });
});

describe('pending payment record', () => {
  const record = {
    eventId: 900001,
    invoiceGuid: 'e8b7bf55-a16b-4ee9-a826-277d5d6ade43',
    invoiceTotal: 24,
    summary: { attendees: [{ name: 'Jen Cano', detail: 'Elementary' }], extras: null },
  };

  it('round-trips through localStorage and expires after the TTL', () => {
    clearPendingPayment();
    savePendingPayment(record, 1_000);
    expect(readPendingPayment(2_000)).toEqual({ ...record, savedAt: 1_000 });
    expect(readPendingPayment(1_000 + PENDING_PAYMENT_TTL_MS + 1)).toBeNull();
    // Expiry removes the record for good.
    expect(localStorage.getItem(PENDING_PAYMENT_KEY)).toBeNull();
  });

  it('ignores garbage and a missing store', () => {
    localStorage.setItem(PENDING_PAYMENT_KEY, '{"eventId":"x"}');
    expect(readPendingPayment()).toBeNull();
    localStorage.setItem(PENDING_PAYMENT_KEY, 'not json');
    expect(readPendingPayment()).toBeNull();
    clearPendingPayment();
    expect(readPendingPayment(Date.now(), null)).toBeNull();
    expect(() => savePendingPayment(record, Date.now(), null)).not.toThrow();
  });
});
