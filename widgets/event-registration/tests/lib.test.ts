import { describe, expect, it } from 'vitest';
import {
  attendeeIdentity,
  buildPlan,
  draftReducer,
  EMPTY_DRAFT,
  type DraftRegistration,
} from '../src/lib/draft';
import { buildCheckoutUrl, readPageContext } from '../src/lib/page-url';
import { formatEventRange, formatPrice } from '../src/lib/format';

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
      pageUrl: 'https://www.perimeter.org/family-registration/',
    });
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

  it('formats an event range in the congregation zone with the zone label', () => {
    const text = formatEventRange('2026-09-27T18:00:00', '2026-09-27T20:00:00', 'America/New_York');
    expect(text).toBe('Sun, Sep 27, 2026, 6:00 PM – 8:00 PM EDT');
  });
});
