/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { AuthProvider } from '@perimeter/auth';
import { App } from '../src/app';
import { PrayerWallConfigSchema, type PrayerWallConfig } from '../src/types';

/** Mutable hook state the mocks read; reset before each test. */
const state = vi.hoisted<{
  feed: unknown;
  identity: unknown;
  submit: unknown;
  pray: unknown;
}>(() => ({
  feed: undefined,
  identity: undefined,
  submit: undefined,
  pray: undefined,
}));

/** reCAPTCHA token minting is mocked — no Google script in tests. */
const recaptcha = vi.hoisted(() => ({
  getRecaptchaToken: vi.fn(),
}));

vi.mock('@perimeter/api-hooks', () => ({
  usePrayerRequests: () => state.feed,
  usePrayerWallIdentity: () => state.identity,
  useSubmitPrayerRequest: () => state.submit,
  useRecordPrayer: () => state.pray,
}));

vi.mock('@perimeter/widget-runtime', () => ({
  getRecaptchaToken: recaptcha.getRecaptchaToken,
  loadRecaptchaV3: vi.fn().mockResolvedValue(undefined),
}));

function request(over: Record<string, unknown> = {}) {
  return {
    id: 66296,
    submittedBy: 'Davis',
    submittedAt: '2026-08-17T08:29:00.000-04:00',
    request: 'Please pray for my treatment.',
    prayerCount: 19,
    ...over,
  };
}

function feedResult(requests: unknown[], over: Record<string, unknown> = {}) {
  return {
    data: {
      success: true,
      data: {
        requests,
        pagination: {
          page: 1,
          perPage: 8,
          total: requests.length,
          totalPages: Math.max(1, Math.ceil(requests.length / 8)),
        },
      },
    },
    isLoading: false,
    isError: false,
    ...over,
  };
}

function queryResult(data: unknown, over: Record<string, unknown> = {}) {
  return {
    data: data === undefined ? undefined : { success: true, data },
    isLoading: false,
    isError: false,
    ...over,
  };
}

function mutationResult(over: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    variables: undefined,
    ...over,
  };
}

function config(overrides: Record<string, unknown> = {}): PrayerWallConfig {
  return PrayerWallConfigSchema.parse(overrides);
}

function authStub(authenticated: boolean): AuthProvider {
  return {
    getToken: () => (authenticated ? 'token' : null),
    isAuthenticated: () => authenticated,
    onChange: () => () => {},
  };
}

beforeEach(() => {
  window.localStorage.clear();
  state.feed = feedResult([request()]);
  state.identity = queryResult(undefined);
  state.submit = mutationResult();
  state.pray = mutationResult();
  recaptcha.getRecaptchaToken.mockReset();
  recaptcha.getRecaptchaToken.mockResolvedValue('recaptcha-token');
});

describe('feed', () => {
  it('renders a card the way the wall reads it', () => {
    render(<App config={config()} auth={authStub(false)} />);

    expect(screen.getByText('Monday, August 17, 2026 by Davis')).toBeInTheDocument();
    expect(screen.getByText('Please pray for my treatment.')).toBeInTheDocument();
  });

  it('offers "I Prayed" before this browser has prayed', () => {
    render(<App config={config()} auth={authStub(false)} />);

    expect(screen.getByRole('button', { name: 'I Prayed' })).toBeInTheDocument();
    expect(screen.queryByText(/Prayed for/)).not.toBeInTheDocument();
  });

  it('shows the running count instead once this browser has prayed', () => {
    window.localStorage.setItem('perimeter-prayer-wall:prayed', JSON.stringify([66296]));

    render(<App config={config()} auth={authStub(false)} />);

    expect(screen.getByText('Prayed for 19 Times')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'I Prayed' })).not.toBeInTheDocument();
  });

  it('records a prayer and swaps in the count the server returned', async () => {
    const mutate = vi.fn(
      (_id: number, opts: { onSuccess: (r: { data: { prayerCount: number } }) => void }) => {
        opts.onSuccess({ data: { prayerCount: 20 } });
      },
    );
    state.pray = mutationResult({ mutate });

    render(<App config={config()} auth={authStub(false)} />);
    fireEvent.click(screen.getByRole('button', { name: 'I Prayed' }));

    expect(mutate).toHaveBeenCalledWith(66296, expect.anything());
    await waitFor(() => {
      expect(screen.getByText('Prayed for 20 Times')).toBeInTheDocument();
    });
  });

  it('remembers the prayer across a remount', async () => {
    const mutate = vi.fn(
      (_id: number, opts: { onSuccess: (r: { data: { prayerCount: number } }) => void }) => {
        opts.onSuccess({ data: { prayerCount: 20 } });
      },
    );
    state.pray = mutationResult({ mutate });

    const first = render(<App config={config()} auth={authStub(false)} />);
    fireEvent.click(screen.getByRole('button', { name: 'I Prayed' }));
    await waitFor(() => expect(screen.getByText('Prayed for 20 Times')).toBeInTheDocument());
    first.unmount();

    render(<App config={config()} auth={authStub(false)} />);
    // 19 rather than 20: the reload shows MP's stored count, and the point is
    // that the button does not come back.
    await waitFor(() => expect(screen.getByText('Prayed for 19 Times')).toBeInTheDocument());
  });

  it('says so when there is nothing on the wall', () => {
    state.feed = feedResult([]);
    render(<App config={config()} auth={authStub(false)} />);

    expect(screen.getByText(/no prayer requests to show/i)).toBeInTheDocument();
  });

  it('surfaces a load failure without breaking the page', () => {
    state.feed = feedResult([], { isError: true, data: undefined });
    render(<App config={config()} auth={authStub(false)} />);

    expect(screen.getByText(/Unable to load the prayer wall/i)).toBeInTheDocument();
  });

  it('can be hidden entirely', () => {
    render(<App config={config({ showFeed: false })} auth={authStub(false)} />);

    expect(screen.queryByText('Recent Prayers & Praise')).not.toBeInTheDocument();
  });
});

describe('request form', () => {
  it('stays collapsed until the bar is pressed', () => {
    render(<App config={config()} auth={authStub(false)} />);

    expect(screen.queryByLabelText('Request')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I have a Prayer or Praise Request' }));
    expect(screen.getByLabelText('Request')).toBeInTheDocument();
  });

  it('asks a visitor for their name and email', () => {
    render(<App config={config()} auth={authStub(false)} />);
    fireEvent.click(screen.getByRole('button', { name: 'I have a Prayer or Praise Request' }));

    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Me')).not.toBeInTheDocument();
  });

  it('shows a signed-in member their own name and asks for nothing else', () => {
    state.identity = queryResult({ name: 'Joseph Wood' });

    render(<App config={config()} auth={authStub(true)} />);
    fireEvent.click(screen.getByRole('button', { name: 'I have a Prayer or Praise Request' }));

    expect(screen.getByLabelText('Me')).toHaveValue('Joseph Wood');
    expect(screen.queryByLabelText('First Name')).not.toBeInTheDocument();
  });

  it('submits a visitor request with the typed identity and a reCAPTCHA token', async () => {
    const mutate = vi.fn();
    state.submit = mutationResult({ mutate });

    render(<App config={config()} auth={authStub(false)} />);
    fireEvent.click(screen.getByRole('button', { name: 'I have a Prayer or Praise Request' }));
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Samantha' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Halpin' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'samantha@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Request'), { target: { value: 'Please pray.' } });
    fireEvent.click(screen.getByLabelText('Share Anonymously'));
    fireEvent.click(screen.getByLabelText('Email Me When Someone Prays'));
    fireEvent.submit(screen.getByRole('button', { name: 'Submit Request' }).closest('form')!);

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        firstName: 'Samantha',
        lastName: 'Halpin',
        email: 'samantha@example.com',
        request: 'Please pray.',
        privacy: 'anonymous',
        notifyMe: true,
        recaptchaToken: 'recaptcha-token',
      });
    });
  });

  it('omits the name fields for a signed-in member — the token decides', async () => {
    const mutate = vi.fn();
    state.submit = mutationResult({ mutate });
    state.identity = queryResult({ name: 'Joseph Wood' });

    render(<App config={config()} auth={authStub(true)} />);
    fireEvent.click(screen.getByRole('button', { name: 'I have a Prayer or Praise Request' }));
    fireEvent.change(screen.getByLabelText('Request'), { target: { value: 'Please pray.' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Submit Request' }).closest('form')!);

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        request: 'Please pray.',
        privacy: 'online',
        notifyMe: false,
        recaptchaToken: 'recaptcha-token',
      });
    });
  });

  it('does not submit when reCAPTCHA cannot mint a token', async () => {
    const mutate = vi.fn();
    state.submit = mutationResult({ mutate });
    recaptcha.getRecaptchaToken.mockRejectedValue(new Error('blocked'));

    render(<App config={config()} auth={authStub(false)} />);
    fireEvent.click(screen.getByRole('button', { name: 'I have a Prayer or Praise Request' }));
    fireEvent.change(screen.getByLabelText('Request'), { target: { value: 'Please pray.' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Submit Request' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Could not verify your request/i);
    });
    expect(mutate).not.toHaveBeenCalled();
  });

  it('tells the submitter their request awaits review', () => {
    state.submit = mutationResult({ isSuccess: true });

    render(<App config={config()} auth={authStub(false)} />);
    fireEvent.click(screen.getByRole('button', { name: 'I have a Prayer or Praise Request' }));

    expect(screen.getByText(/has been received/i)).toBeInTheDocument();
    expect(screen.getByText(/once our staff have reviewed it/i)).toBeInTheDocument();
  });

  it('can be hidden entirely', () => {
    render(<App config={config({ showForm: false })} auth={authStub(false)} />);

    expect(
      screen.queryByRole('button', { name: 'I have a Prayer or Praise Request' }),
    ).not.toBeInTheDocument();
  });
});
