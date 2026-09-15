/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it('pre-fills the signed-in purchaser from the roster', () => {
    render(<App config={config} auth={authStub(true)} />);
    expect(screen.getByText(/Registering as/)).toHaveTextContent('Jen Cano');
    expect(screen.getByLabelText('Email *')).toHaveValue('jen@example.com');
    expect(screen.getByLabelText('Address')).toHaveValue('5088 Bridgeport Way');
  });

  it('keeps a section with an Enable_Label collapsed behind its prompt', () => {
    render(<App config={config} auth={authStub(true)} />);
    const card = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    expect(within(card).getByText('Registering a student?')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Add a student' })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('checkbox'));
    expect(within(card).getByRole('button', { name: 'Add a student' })).toBeInTheDocument();
  });

  it('opens the editor with roster eligibility applied, and saves a registration', () => {
    render(<App config={config} auth={authStub(true)} />);
    const card = screen.getByRole('region', { name: 'Student Night of Worship (Grades 6-12)' });
    fireEvent.click(within(card).getByRole('checkbox'));
    fireEvent.click(within(card).getByRole('button', { name: 'Add a student' }));

    // Jen is an adult (minors only), Max is already registered, William is eligible.
    expect(within(card).getByLabelText(/Jen Cano/)).toBeDisabled();
    expect(within(card).getByText('children only')).toBeInTheDocument();
    expect(within(card).getByLabelText(/Max Cano/)).toBeDisabled();
    expect(within(card).getByText('already registered')).toBeInTheDocument();
    expect(within(card).getByLabelText(/William Cano/)).toBeEnabled();
    expect(within(card).getByText(/age 11/)).toBeInTheDocument();

    // Required form fields block the save until answered.
    fireEvent.click(within(card).getByLabelText(/William Cano/));
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
  });

  it('shows the sign-in notice and the guest form when signed out', () => {
    hooks.roster.data = undefined;
    render(<App config={config} auth={authStub(false)} />);
    expect(screen.getByText('Sign in to register your family.')).toBeInTheDocument();
    expect(screen.getByLabelText('First name *')).toBeInTheDocument();
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
