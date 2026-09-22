/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type * as ApiHooks from '@perimeter/api-hooks';
import type { RegistrationQuote } from '@perimeter/api-hooks';
import type * as WidgetRuntime from '@perimeter/widget-runtime';
import type { AuthProvider } from '@perimeter/auth';
import { App } from '../src/app';
import { canoHousehold, envelope, familyNight } from './fixtures';
import { fireResize } from './resize-observer';

/**
 * The phone branch (container narrower than 768px): sticky summary bar and
 * bottom CTA instead of the review column, the editor in a bottom-sheet
 * `<dialog>` instead of inline in the card, image-led cards with a fallback
 * chain. jsdom reports a 0px width, so each test pushes a width through the
 * controllable ResizeObserver mock.
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
  defaultImageUrl: 'https://cdn.example.org/default.jpg',
};

/** A quote for one $10 student registration. */
function quoteFor(attendeeName: string): RegistrationQuote {
  return {
    eventId: 900001,
    registrations: [
      {
        registrationIndex: 0,
        sectionKey: 'related:103',
        eventId: 900013,
        contactId: 698112,
        attendeeName,
        isMinor: true,
        lines: [
          {
            kind: 'base',
            productId: 9003,
            productOptionPriceId: null,
            title: 'Student Night of Worship',
            quantity: 1,
            unitPrice: 10,
            lineTotal: 10,
            itemNote: null,
            depositRequested: false,
          },
        ],
        subtotal: 10,
        optionsSummary: null,
        answerSummary: null,
        attendingOnline: false,
        addsToGroupIds: [],
        overlapsWithRegistrationIndexes: [],
        resolvedOptions: [],
      },
    ],
    invoiceTotal: 10,
    depositRequested: false,
    participationStatusId: 2,
    invoiceStatusId: 1,
    addressRequired: false,
    problems: [],
    submittable: true,
    quoteHash: 'abc',
  };
}

function root(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[class~="@container"]');
  if (!el) throw new Error('widget root not rendered');
  return el;
}

/** Render at a phone-width container. */
function renderPhone(signedIn = true) {
  const result = render(<App config={config} auth={authStub(signedIn)} />);
  act(() => fireResize(root(), 343));
  return result;
}

const studentCard = () =>
  screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });

function tick(scope: HTMLElement, name: RegExp): void {
  const box = within(scope).getByRole('checkbox', { name });
  if (!(box as HTMLInputElement).checked) fireEvent.click(box);
}

beforeEach(() => {
  hooks.event.data = envelope(familyNight);
  hooks.event.isLoading = false;
  hooks.event.isError = false;
  hooks.roster.data = envelope(canoHousehold);
  hooks.roster.isLoading = false;
  hooks.roster.isError = false;
  hooks.quote.mutate.mockReset();
  hooks.quote.isPending = false;
  hooks.submit.mutate.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('event-registration widget on a phone', () => {
  it('swaps the review column for a sticky summary bar and a sticky CTA', () => {
    renderPhone();
    expect(document.querySelector('[data-slot="summary-bar"]')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="sticky-cta"]')).toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: 'Your registration' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add someone to continue' })).toBeDisabled();
    // The bar collapses to one line: no total row until it is opened.
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('keeps every section in its configured order', () => {
    renderPhone();
    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
      .filter((t) => t !== 'Your information');
    expect(titles).toEqual([
      'Elementary + Early Years Focus',
      'Student Night of Worship (Grades 6-12)',
      'Elementary Active (Grades K-5)',
    ]);
    // The contact line lives in the review, so it is inside the summary bar, not among the cards.
    expect(
      screen.queryByRole('region', { name: 'Your contact information' }),
    ).not.toBeInTheDocument();
    const bar = document.querySelector<HTMLElement>('[data-slot="summary-bar"]')!;
    fireEvent.click(within(bar).getByRole('button', { expanded: false }));
    expect(within(bar).getByRole('region', { name: 'Your contact information' })).toHaveTextContent(
      'Jen Cano',
    );
  });

  it('opens the editor in a bottom sheet, saves from it, and hands focus back', () => {
    renderPhone();
    const card = studentCard();
    const add = within(card).getByRole('button', { name: 'Add a student' });
    add.focus();
    fireEvent.click(add);

    const sheet = screen.getByRole('dialog', {
      name: 'New registration — Student Night of Worship (Grades 6-12)',
    });
    expect(sheet).toHaveAttribute('open');
    expect(within(card).queryByRole('form')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    tick(sheet, /William Cano/);
    fireEvent.change(within(sheet).getByLabelText(/Grade/), { target: { value: '7th' } });
    fireEvent.click(within(sheet).getByLabelText('No'));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add to registration' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(within(card).getByText('William Cano')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Edit William Cano' })).toBeInTheDocument();
    expect(document.activeElement).toBe(add);
  });

  it('closes the sheet on Escape, the close button, and unmount', () => {
    const { unmount } = renderPhone();
    const card = studentCard();
    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));
    let sheet = screen.getByRole('dialog');
    fireEvent(sheet, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');

    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));
    sheet = screen.getByRole('dialog');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('shows the count and total in the bar and the line items when opened', () => {
    vi.useFakeTimers();
    hooks.quote.mutate.mockImplementation(
      (_plan: unknown, opts: { onSuccess: (r: { data: RegistrationQuote }) => void }) =>
        opts.onSuccess({ data: quoteFor('William Cano') }),
    );
    renderPhone();
    const card = studentCard();
    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));
    const sheet = screen.getByRole('dialog');
    tick(sheet, /William Cano/);
    fireEvent.change(within(sheet).getByLabelText(/Grade/), { target: { value: '7th' } });
    fireEvent.click(within(sheet).getByLabelText('No'));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add to registration' }));
    act(() => {
      vi.advanceTimersByTime(400);
    });

    const bar = document.querySelector<HTMLElement>('[data-slot="summary-bar"]')!;
    expect(within(bar).getByText('1 person added')).toBeInTheDocument();
    expect(within(bar).getByText('$10.00')).toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();

    fireEvent.click(within(bar).getByRole('button', { expanded: false }));
    expect(within(bar).getByText('Included')).toBeInTheDocument();
    expect(within(bar).getByText('Student Night of Worship')).toBeInTheDocument();
    expect(within(bar).getByText('Total')).toBeInTheDocument();

    // A submittable quote arms the CTA.
    expect(screen.getByRole('button', { name: 'Register and continue to payment' })).toBeEnabled();
  });

  it('shows no money anywhere on an all-free event', () => {
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
    renderPhone();
    expect(screen.queryByText('Free')).not.toBeInTheDocument();
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it("collects a guest's details in the sheet and shows them as the contact line", () => {
    hooks.roster.data = undefined;
    renderPhone(false);
    expect(
      screen.queryByRole('region', { name: 'Your contact information' }),
    ).not.toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Elementary + Early Years Focus' });
    fireEvent.click(within(card).getByRole('button', { name: "I'm Attending" }));
    const sheet = screen.getByRole('dialog');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add to registration' }));
    expect(
      within(sheet).getByText('Please fill in your name, email and phone.'),
    ).toBeInTheDocument();
    fireEvent.change(within(sheet).getByLabelText('First name *'), { target: { value: 'Sam' } });
    fireEvent.change(within(sheet).getByLabelText('Last name *'), { target: { value: 'Guest' } });
    fireEvent.change(within(sheet).getByLabelText('Email *'), {
      target: { value: 'sam@example.com' },
    });
    fireEvent.change(within(sheet).getByLabelText('Phone *'), {
      target: { value: '770-555-1234' },
    });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add to registration' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const bar = document.querySelector<HTMLElement>('[data-slot="summary-bar"]')!;
    fireEvent.click(within(bar).getByRole('button', { expanded: false }));
    const contact = within(bar).getByRole('region', { name: 'Your contact information' });
    expect(within(contact).getByText('Sam Guest')).toBeInTheDocument();
    expect(within(contact).getByText('sam@example.com')).toBeInTheDocument();
    expect(within(card).getByText('Sam Guest')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue to your details' }),
    ).not.toBeInTheDocument();
  });

  it('falls back from the section image to the hub image, then to a compact card', () => {
    renderPhone();
    const card = studentCard();
    const img = () => within(card).getByRole('presentation');
    expect(img().getAttribute('src')).toMatch(/\/api\/event-image\/900013$/);
    fireEvent.error(img());
    expect(img().getAttribute('src')).toMatch(/\/api\/event-image\/900001$/);
    fireEvent.error(img());
    expect(img()).toHaveAttribute('src', 'https://cdn.example.org/default.jpg');
    fireEvent.error(img());
    expect(within(card).queryByRole('presentation')).not.toBeInTheDocument();
    expect(card).toHaveAttribute('data-slot', 'section-card-noimage');
  });

  it('returns to the desktop layout when the container grows', () => {
    renderPhone();
    act(() => fireResize(root(), 900));
    expect(document.querySelector('[data-slot="summary-bar"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="sticky-cta"]')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Your registration' })).toBeInTheDocument();
  });
});
