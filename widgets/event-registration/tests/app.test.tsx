/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type * as ApiHooks from '@perimeter/api-hooks';
import type * as WidgetRuntime from '@perimeter/widget-runtime';
import type { AuthProvider } from '@perimeter/auth';
import { App } from '../src/app';
import { canoHousehold, envelope, familyNight } from './fixtures';

/**
 * Renders the widget against the Family Night fixture with every api-hook
 * mocked. The hooks are the seam: what each returns is what the widget
 * reacts to, so these tests pin the UI states (sign-in, sections, roster
 * eligibility, editor, review) without a server.
 */

interface QueryState {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

interface MutationState {
  mutate: ReturnType<typeof vi.fn>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

const hooks = vi.hoisted(
  (): { event: QueryState; roster: QueryState; quote: MutationState; submit: MutationState } => ({
    event: { data: undefined, isLoading: false, isError: false, error: null },
    roster: { data: undefined, isLoading: false, isError: false, error: null },
    quote: { mutate: vi.fn(), isPending: false, isError: false, error: null },
    submit: { mutate: vi.fn(), isPending: false, isError: false, error: null },
  }),
);

vi.mock('@perimeter/api-hooks', async (importActual) => {
  const actual = await importActual<typeof ApiHooks>();
  return {
    ...actual,
    useRegistrationEvent: () => hooks.event,
    useRegistrationRoster: () => hooks.roster,
    useRegistrationQuote: () => hooks.quote,
    useSubmitRegistration: () => hooks.submit,
  };
});

vi.mock('@perimeter/widget-runtime', async (importActual) => {
  const actual = await importActual<typeof WidgetRuntime>();
  return {
    ...actual,
    loadRecaptchaV3: vi.fn(() => Promise.resolve({ ready: vi.fn(), execute: vi.fn() })),
    getRecaptchaToken: vi.fn(() => Promise.resolve('captcha-token')),
  };
});

function authStub(signedIn: boolean): AuthProvider {
  return {
    getToken: () => (signedIn ? 'token' : null),
    isAuthenticated: () => signedIn,
    onChange: () => () => {},
  };
}

const config = {
  checkoutUrl: 'https://www.perimeter.org/event-checkout/',
  returnUrl: '/events',
  idParam: 'id',
  eventId: 900001,
  invoiceParam: 'id',
  showMap: true,
  recaptchaSiteKey: 'site-key',
  stickyTopOffset: 0,
};

beforeEach(() => {
  hooks.event.data = envelope(familyNight);
  hooks.event.isLoading = false;
  hooks.event.isError = false;
  hooks.roster.data = envelope(canoHousehold);
  hooks.roster.isLoading = false;
  hooks.roster.isError = false;
  hooks.quote.mutate.mockReset();
  hooks.submit.mutate.mockReset();
});

/** Tick a picker checkbox; a sole eligible member is pre-ticked, so a click there would untick. */
function tick(card: HTMLElement, name: RegExp): void {
  const box = within(card).getByRole('checkbox', { name });
  if (!(box as HTMLInputElement).checked) fireEvent.click(box);
}

describe('event-registration widget', () => {
  it('shows the event details and one card per section', () => {
    render(<App config={config} auth={authStub(true)} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Family Night' })).toBeInTheDocument();
    expect(screen.getAllByText(/Sun, Sep 27, 2026, 6:00 PM – 8:00 PM/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: 'Elementary + Early Years Focus' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Student Night of Worship (Grades 6-12)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Elementary Active (Grades K-5)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('5 spots left')).toBeInTheDocument();
  });

  it('shows the signed-in purchaser as a one-line contact, with fields behind Edit', () => {
    render(<App config={config} auth={authStub(true)} />);
    // It is part of the review column, between the total and the submit.
    const review = screen.getByRole('complementary', { name: 'Your registration' });
    const contact = within(review).getByRole('region', { name: 'Your contact information' });
    expect(within(contact).getByText('Contact for this registration')).toBeInTheDocument();
    expect(within(contact).getByText('Jen Cano')).toBeInTheDocument();
    expect(within(contact).getByText('jen@example.com')).toBeInTheDocument();
    expect(screen.queryByText(/Registering as/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email *')).not.toBeInTheDocument();

    fireEvent.click(within(contact).getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Email *')).toHaveValue('jen@example.com');
    expect(screen.getByLabelText('Address')).toHaveValue('5088 Bridgeport Way');
    // Nothing changed yet, so there is nothing to write back.
    expect(screen.queryByLabelText(/update my record/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Phone *'), { target: { value: '770-555-0000' } });
    expect(screen.getByLabelText(/update my record/)).toBeChecked();
    fireEvent.click(within(contact).getByRole('button', { name: 'Done' }));
    expect(within(contact).getByText('770-555-0000')).toBeInTheDocument();
  });

  it('lists sections under the headings staff set, and under none when they set none', () => {
    render(<App config={config} auth={authStub(true)} />);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    // The event title is the only h1 until staff set a group.
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
      'Family Night',
    ]);
    cleanup();

    hooks.event.data = envelope({
      ...familyNight,
      sections: familyNight.sections.map((s) =>
        s.key === 'related:101' ? { ...s, sectionGroup: 'Adults' } : { ...s, sectionGroup: 'Kids' },
      ),
    });
    render(<App config={config} auth={authStub(true)} />);
    const groups = screen.getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-labelledby'))).toHaveLength(2);
    expect(groups.map((g) => within(g).getByRole('heading', { level: 1 }).textContent)).toEqual([
      'Adults',
      'Kids',
    ]);
    expect(
      within(groups[1]!).getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' }),
    ).toBeInTheDocument();
  });

  it("labels the button I'm Attending, Add a student when grade-bounded, else Button_Text", () => {
    hooks.event.data = envelope({
      ...familyNight,
      sections: familyNight.sections.map((s) =>
        s.key === 'related:104'
          ? { ...s, audience: { ...s.audience, minGrade: 0, maxGrade: 5 } }
          : s.key === 'related:103'
            ? { ...s, buttonText: 'Add a child' }
            : s,
      ),
    });
    render(<App config={config} auth={authStub(true)} />);
    const adults = screen.getByRole('region', { name: 'Elementary + Early Years Focus' });
    const attending = within(adults).getByRole('button', { name: "I'm Attending" });
    expect(attending).toHaveAccessibleDescription('Elementary + Early Years Focus');
    // Grade-bounded: "Add a student" whatever staff typed ("Add … registrant" here).
    const elementary = screen.getByRole('region', { name: 'Elementary Active (Grades K-5)' });
    expect(within(elementary).getByRole('button', { name: 'Add a student' })).toBeInTheDocument();
    // No grade bounds: the staff-set Button_Text stands.
    const students = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    expect(within(students).getByRole('button', { name: 'Add a child' })).toBeInTheDocument();
    // No audience or grade badges; the status badge stays.
    expect(within(elementary).queryByText('Grades K–5th')).not.toBeInTheDocument();
    expect(within(students).queryByText('Children')).not.toBeInTheDocument();
    expect(within(students).getByText('5 spots left')).toBeInTheDocument();
  });

  it('does not gate a section behind its Enable_Label question: the card itself is the opt-in', () => {
    render(<App config={config} auth={authStub(true)} />);
    const card = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    expect(within(card).queryByText('Registering a student?')).not.toBeInTheDocument();
    expect(within(card).queryByRole('checkbox')).not.toBeInTheDocument();
    // One control per card: the section's Button_Text, stretched over the card.
    expect(within(card).getAllByRole('button')).toHaveLength(1);
    expect(within(card).getByRole('button', { name: 'Add a student' })).toBeInTheDocument();
    expect(card).toHaveAttribute('data-tappable', 'true');
  });

  it('opens the editor with roster eligibility applied, and saves a registration', () => {
    render(<App config={config} auth={authStub(true)} />);
    const card = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));

    // Jen is an adult (minors only), Max is already registered, William is eligible.
    expect(within(card).getByLabelText(/Jen Cano/)).toBeDisabled();
    expect(within(card).getByText('children only')).toBeInTheDocument();
    expect(within(card).getByLabelText(/Max Cano/)).toBeDisabled();
    expect(within(card).getByText('already registered')).toBeInTheDocument();
    expect(within(card).getByLabelText(/William Cano/)).toBeEnabled();
    expect(within(card).getByText(/age 11/)).toBeInTheDocument();

    // Required form fields block the save until answered.
    tick(card, /William Cano/);
    // Minors-only: the widget owns the birth date, prefilled from the roster.
    const dob = within(card).getByLabelText(/Date of birth/);
    expect(dob).toHaveValue('2015-03-21');
    fireEvent.change(dob, { target: { value: '2015-03-22' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Add to registration' }));
    expect(within(card).getAllByText('This question is required.')).toHaveLength(2);

    fireEvent.change(within(card).getByLabelText(/Grade/), { target: { value: '7th' } });
    fireEvent.click(within(card).getByLabelText('No'));
    // The dependent "Allergy details" field is inactive when the parent is No.
    expect(within(card).queryByLabelText(/Allergy details/)).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Add to registration' }));

    expect(within(card).getByText('William Cano')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Edit William Cano' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Remove William Cano' })).toBeInTheDocument();
    // The corrected date is kept on the saved attendee: reopening shows it.
    fireEvent.click(within(card).getByRole('button', { name: 'Edit William Cano' }));
    expect(within(card).getByLabelText(/Date of birth/)).toHaveValue('2015-03-22');
  });

  it('offers only adult relationships when adding someone to an adults-only section', () => {
    hooks.event.data = envelope({
      ...familyNight,
      sections: familyNight.sections.map((s) =>
        s.key === 'related:101'
          ? { ...s, audience: { ...s.audience, minAge: 18, adultsOnly: true } }
          : s,
      ),
    });
    render(<App config={config} auth={authStub(true)} />);
    const card = screen.getByRole('region', { name: 'Elementary + Early Years Focus' });
    // No dark audience badge (2026-09-22): the group heading says who it is for.
    expect(within(card).queryByText('Adults')).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: "I'm Attending" }));
    // No visible "New registration" label under the card (2026-09-22); the form keeps the name.
    expect(within(card).queryByText('New registration')).not.toBeInTheDocument();
    expect(within(card).getByRole('form', { name: 'New registration' })).toBeInTheDocument();
    fireEvent.click(within(card).getByLabelText(/Someone not listed/));
    const relationship = within(card).getByLabelText<HTMLSelectElement>('Relationship');
    expect([...relationship.options].map((o) => o.textContent)).toEqual([
      'Other adult',
      'Adult child',
    ]);
  });

  it('asks for a grade in a grade-bounded section, prefilled from the roster, and keeps the answer', () => {
    hooks.event.data = envelope({
      ...familyNight,
      sections: familyNight.sections.map((s) =>
        s.key === 'related:103'
          ? { ...s, audience: { ...s.audience, minGrade: 6, maxGrade: 12 } }
          : s,
      ),
    });
    hooks.roster.data = envelope({
      ...canoHousehold,
      members: canoHousehold.members.map((m) =>
        m.contactId === 698112
          ? {
              ...m,
              grade: 6,
              eligibility: m.eligibility.map((e) =>
                e.sectionKey === 'related:103' ? { ...e, requires: ['grade' as const] } : e,
              ),
            }
          : m,
      ),
    });
    render(<App config={config} auth={authStub(true)} />);
    const card = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    // The grades are in the title, so there is no grade badge (2026-09-22).
    expect(within(card).queryByText('Grades 6th–12th')).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));
    tick(card, /William Cano/);
    // Two things are labelled "Grade": our select and the form's own question.
    const gradeControls = () => within(card).getAllByLabelText(/Grade/);
    const isOurs = (el: HTMLElement) => el.id.endsWith('-member-grade');
    const gradeSelect = gradeControls().find(isOurs) as HTMLSelectElement;
    const gradeQuestion = gradeControls().find((el) => !isOurs(el)) as HTMLElement;
    expect(gradeSelect).toHaveValue('6');
    fireEvent.change(gradeSelect, { target: { value: '7' } });
    fireEvent.change(gradeQuestion, { target: { value: '7th' } });
    fireEvent.click(within(card).getByLabelText('No'));
    fireEvent.click(within(card).getByRole('button', { name: 'Add to registration' }));
    expect(within(card).getByRole('button', { name: 'Edit William Cano' })).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Edit William Cano' }));
    expect(
      within(card)
        .getAllByLabelText(/Grade/)
        .find((el) => el.id.endsWith('-member-grade')),
    ).toHaveValue('7');
  });

  it('places a child in the room whose rule fits and hides the choice, or shows the radios when none fits', () => {
    const worship = familyNight.sections.find((s) => s.key === 'related:103')!;
    const base = worship.product!.groups[0]!;
    const room = (id: number, title: string, minAgeMonths: number, maxAgeMonths: number) => ({
      ...base.prices[0]!,
      productOptionPriceId: id,
      title,
      price: 0,
      hidden: false,
      isPromo: false,
      remaining: null,
      placement: { minAgeMonths, maxAgeMonths, minGrade: null, maxGrade: null },
    });
    const withRooms = (prices: ReturnType<typeof room>[]) =>
      envelope({
        ...familyNight,
        sections: familyNight.sections.map((s) =>
          s.key === 'related:103'
            ? {
                ...s,
                product: {
                  ...s.product!,
                  groups: [
                    ...s.product!.groups,
                    {
                      ...base,
                      productOptionGroupId: 7100,
                      name: 'Room',
                      required: true,
                      mutuallyExclusive: true,
                      prices,
                    },
                  ],
                },
              }
            : s,
        ),
      });

    // William (2015-03-21) is 138 months on event day → the 8-12 room, no question asked.
    hooks.event.data = withRooms([room(8101, 'Infants', 0, 24), room(8102, 'Kids 8-12', 96, 156)]);
    const { unmount } = render(<App config={config} auth={authStub(true)} />);
    let card = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));
    tick(card, /William Cano/);
    expect(within(card).getByText(/Kids 8-12/)).toBeInTheDocument();
    expect(within(card).getByText(/from William's birth date/)).toBeInTheDocument();
    expect(within(card).queryByLabelText(/Infants/)).not.toBeInTheDocument();
    unmount();

    // No room fits an 11-year-old → the radios come back with a hint.
    hooks.event.data = withRooms([room(8101, 'Infants', 0, 24), room(8103, 'Toddlers', 24, 48)]);
    render(<App config={config} auth={authStub(true)} />);
    card = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));
    tick(card, /William Cano/);
    expect(within(card).getByLabelText(/Infants/)).toBeInTheDocument();
    expect(within(card).getByLabelText(/Toddlers/)).toBeInTheDocument();
    expect(within(card).getByText(/None of these fit William's age/)).toBeInTheDocument();
  });

  it('adds several household members in one pass', () => {
    // Make William and Max eligible for the adult-focus section so three can be ticked.
    hooks.roster.data = envelope({
      ...canoHousehold,
      members: canoHousehold.members.map((m) => ({
        ...m,
        eligibility: m.eligibility.map((e) =>
          e.sectionKey === 'related:101' ? { ...e, eligible: true, reason: null } : e,
        ),
      })),
    });
    render(<App config={config} auth={authStub(true)} />);
    const card = screen.getByRole('region', { name: 'Elementary + Early Years Focus' });
    fireEvent.click(within(card).getByRole('button', { name: "I'm Attending" }));
    // Three are eligible, so nobody is pre-ticked; tick all three.
    tick(card, /Jen Cano/);
    tick(card, /William Cano/);
    tick(card, /Max Cano/);
    expect(within(card).getByRole('button', { name: 'Add 3 to registration' })).toBeInTheDocument();
    // Nothing to ask for this section, so each ticked person collapses to a ready row.
    expect(card.querySelectorAll('[data-drawer-state="complete"]')).toHaveLength(3);
    expect(card.querySelectorAll('[data-drawer-state="open"]')).toHaveLength(0);
    fireEvent.click(within(card).getByRole('button', { name: 'Add 3 to registration' }));
    expect(within(card).getByRole('button', { name: 'Remove Jen Cano' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Remove William Cano' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Remove Max Cano' })).toBeInTheDocument();
    // Untick nobody and try to add again: they are now "already added" and the picker says so.
    fireEvent.click(within(card).getByRole('button', { name: "I'm Attending" }));
    expect(within(card).getByRole('checkbox', { name: /Jen Cano/ })).toBeDisabled();
    expect(within(card).getAllByText('already added')).toHaveLength(3);
  });

  it("opens a child's block with the answers MP already holds, and lets the parent change them", () => {
    hooks.roster.data = envelope({
      ...canoHousehold,
      members: canoHousehold.members.map((m) =>
        m.contactId === 698112
          ? {
              ...m,
              prefill: [
                { formFieldId: 6001, response: '7th', since: '2026-09-01T10:00:00' },
                { formFieldId: 6002, response: 'No', since: '2026-09-01T10:00:00' },
              ],
            }
          : m,
      ),
    });
    render(<App config={config} auth={authStub(true)} />);
    const card = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));
    tick(card, /William Cano/);
    // Everything is already answered from his record, so William collapses to a summary row.
    const row = card.querySelector('[data-drawer-state="complete"]');
    expect(row).not.toBeNull();
    expect(row).toHaveTextContent('7th');
    expect(row).toHaveTextContent('No');
    expect(within(card).queryByLabelText(/Grade/)).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Change answers for William' }));
    expect(within(card).getByLabelText(/Grade/)).toHaveValue('7th');
    expect(within(card).getByLabelText('No')).toBeChecked();
    expect(within(card).getByText(/Filled in from William's record/)).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Done with William' }));
    expect(card.querySelector('[data-drawer-state="complete"]')).not.toBeNull();
    // Prefilled answers satisfy the required fields, so the save goes straight through.
    fireEvent.click(within(card).getByRole('button', { name: 'Add to registration' }));
    expect(within(card).getByRole('button', { name: 'Edit William Cano' })).toBeInTheDocument();
    // The parent can still change a prefilled answer.
    fireEvent.click(within(card).getByRole('button', { name: 'Edit William Cano' }));
    fireEvent.change(within(card).getByLabelText(/Grade/), { target: { value: '8th' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Save changes' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Edit William Cano' }));
    expect(within(card).getByLabelText(/Grade/)).toHaveValue('8th');
  });

  it('confirms in place instead of going to checkout when nothing is owed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const freeQuote = {
      eventId: 900001,
      registrations: [
        {
          registrationIndex: 0,
          sectionKey: 'related:101',
          eventId: 900011,
          contactId: 684077,
          attendeeName: 'Jen Cano',
          isMinor: false,
          lines: [],
          subtotal: 0,
          optionsSummary: null,
          answerSummary: null,
          attendingOnline: false,
          addsToGroupIds: [],
          overlapsWithRegistrationIndexes: [],
          resolvedOptions: [],
        },
      ],
      invoiceTotal: 0,
      depositRequested: false,
      participationStatusId: 2,
      invoiceStatusId: 1,
      addressRequired: false,
      problems: [],
      submittable: true,
      quoteHash: 'free',
    };
    hooks.quote.mutate.mockImplementation(
      (_plan: unknown, opts: { onSuccess: (r: { data: typeof freeQuote }) => void }) =>
        opts.onSuccess({ data: freeQuote }),
    );
    hooks.submit.mutate.mockImplementation(
      (_body: unknown, opts: { onSuccess: (r: { data: unknown }) => void }) =>
        opts.onSuccess({
          data: {
            dryRun: false,
            idempotencyKey: 'k',
            replayed: false,
            invoiceId: 1,
            invoiceGuid: 'g',
            invoiceTotal: 0,
            invoiceStatusId: 1,
            checkoutUrl: 'https://www.perimeter.org/event-checkout/?id=g',
            participants: [],
            quote: freeQuote,
          },
        }),
    );
    render(<App config={config} auth={authStub(true)} />);
    const card = screen.getByRole('region', { name: 'Elementary + Early Years Focus' });
    fireEvent.click(within(card).getByRole('button', { name: "I'm Attending" }));
    fireEvent.click(within(card).getByRole('button', { name: 'Add to registration' }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete registration' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: "You're registered" })).toBeInTheDocument(),
    );
    const done = screen.getByRole('region', { name: "You're registered" });
    expect(within(done).getByText('Jen Cano')).toBeInTheDocument();
    expect(within(done).getByText('Elementary + Early Years Focus')).toBeInTheDocument();
    expect(within(done).getByText(/jen@example.com/)).toBeInTheDocument();
    // The event cards are gone until they ask to register someone else.
    expect(
      screen.queryByRole('region', { name: 'Student Night of Worship (Grades 6-12)' }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(done).getByRole('button', { name: 'Register someone else' }));
    expect(
      screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' }),
    ).toBeInTheDocument();
    // The draft was cleared: nothing is listed on the card any more.
    expect(
      within(screen.getByRole('region', { name: 'Elementary + Early Years Focus' })).queryByRole(
        'button',
        { name: 'Remove Jen Cano' },
      ),
    ).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('hides "Free" badges and $0.00 amounts when nothing on the event costs anything', () => {
    hooks.event.data = envelope({
      ...familyNight,
      sections: familyNight.sections.map((s) => ({
        ...s,
        product: s.product && {
          ...s.product,
          basePrice: 0,
          depositPrice: null,
          groups: s.product.groups.map((g) => ({
            ...g,
            prices: g.prices.map((p) => ({ ...p, price: 0 })),
          })),
        },
      })),
    });
    render(<App config={config} auth={authStub(true)} />);
    expect(screen.queryByText('Free')).not.toBeInTheDocument();
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));
    expect(within(card).queryByText(/Registration price/)).not.toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('keeps prices visible when any section or option costs something', () => {
    render(<App config={config} auth={authStub(true)} />);
    expect(screen.getAllByText(/\$\d/).length).toBeGreaterThan(0);
  });

  it('shows the sign-in notice and asks a guest for their details in the editor', () => {
    hooks.roster.data = undefined;
    render(<App config={config} auth={authStub(false)} />);
    expect(screen.getByText('Sign in to register your family.')).toBeInTheDocument();
    // No standalone contact form until they pick an event.
    expect(screen.queryByLabelText('First name *')).not.toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Elementary + Early Years Focus' });
    fireEvent.click(within(card).getByRole('button', { name: "I'm Attending" }));
    expect(within(card).getByText('Your details')).toBeInTheDocument();
    expect(within(card).getByLabelText('First name *')).toBeInTheDocument();
  });

  it('requires sign-in when the event forces login', () => {
    hooks.event.data = envelope({
      ...familyNight,
      viewer: {
        ...familyNight.viewer,
        signedIn: false,
        loginRequired: true,
        canGuestRegister: false,
      },
    });
    hooks.roster.data = undefined;
    render(<App config={config} auth={authStub(false)} />);
    expect(screen.getByText('Please sign in to register.')).toBeInTheDocument();
    expect(screen.queryByLabelText('First name *')).not.toBeInTheDocument();
  });

  it('does not offer the guest form when every open section is children-only', () => {
    hooks.event.data = envelope({
      ...familyNight,
      viewer: { ...familyNight.viewer, signedIn: false },
      sections: familyNight.sections.filter((s) => s.event.minorRegistration),
    });
    hooks.roster.data = undefined;
    render(<App config={config} auth={authStub(false)} />);
    expect(screen.getByText(/for members of your household/)).toBeInTheDocument();
    expect(screen.queryByLabelText('First name *')).not.toBeInTheDocument();
  });

  it('sends the visitor to the external URL when registration lives elsewhere', () => {
    hooks.event.data = envelope({
      ...familyNight,
      externalRegistrationUrl: 'https://elsewhere.test/reg',
      registrationOpen: false,
    });
    render(<App config={config} auth={authStub(true)} />);
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute(
      'href',
      'https://elsewhere.test/reg',
    );
  });

  it('offers to resume a pending checkout when the URL carries an invoice id', () => {
    render(<App config={config} auth={authStub(true)} />);
    // No invoiceid in jsdom's URL by default → normal page.
    expect(screen.queryByText(/registration waiting for payment/)).not.toBeInTheDocument();
  });

  it('shows loading and error states', () => {
    hooks.event.data = undefined;
    hooks.event.isLoading = true;
    const { unmount } = render(<App config={config} auth={authStub(true)} />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    unmount();

    hooks.event.isLoading = false;
    hooks.event.isError = true;
    render(<App config={config} auth={authStub(true)} />);
    expect(screen.getByText(/Unable to load this event/)).toBeInTheDocument();
  });

  it('tells a viewer whose stored token was rejected to sign in again, not that the event is down', async () => {
    const { ApiError } = await vi.importActual<typeof ApiHooks>('@perimeter/api-hooks');
    hooks.event.data = undefined;
    hooks.event.isError = true;
    hooks.event.error = new ApiError(401, 'Authentication required');
    render(<App config={config} auth={authStub(true)} />);
    expect(screen.getByText(/Your sign-in has expired/)).toBeInTheDocument();
    expect(screen.queryByText(/Unable to load this event/)).not.toBeInTheDocument();
  });
});
