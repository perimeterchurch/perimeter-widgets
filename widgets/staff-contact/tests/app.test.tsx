/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/app';
import { StaffContactConfigSchema, type StaffContactConfig } from '../src/types';

const GUID = '641f26fa-12c2-48b7-8392-81e6c02a76bb';
const SITE_KEY = 'test-site-key';

/** Mutable hook state the mocks read; reset before each test. */
const state = vi.hoisted<{ member: unknown; mutation: unknown }>(() => ({
  member: undefined,
  mutation: undefined,
}));

/** reCAPTCHA v3 token minting is mocked — no Google script in tests. */
const recaptcha = vi.hoisted(() => ({
  getRecaptchaToken: vi.fn(),
}));

vi.mock('@perimeter/api-hooks', () => ({
  useStaffMember: () => state.member,
  useSubmitStaffContact: () => state.mutation,
}));

vi.mock('../src/lib/recaptcha', () => ({
  getRecaptchaToken: recaptcha.getRecaptchaToken,
  loadRecaptchaV3: vi.fn().mockResolvedValue(undefined),
}));

function memberResult(data: unknown, over: Record<string, unknown> = {}) {
  return {
    data: data === null ? undefined : { success: true, data },
    isLoading: false,
    isError: false,
    isSuccess: data !== null,
    error: null,
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
    ...over,
  };
}

function config(overrides: Record<string, unknown> = {}): StaffContactConfig {
  return StaffContactConfigSchema.parse({
    contactGuid: GUID,
    recaptchaSiteKey: SITE_KEY,
    ...overrides,
  });
}

function fillForm() {
  fireEvent.change(screen.getByLabelText('Your Name'), {
    target: { value: 'Samantha Halpin' },
  });
  fireEvent.change(screen.getByLabelText('Your Email'), {
    target: { value: 'samantha@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: 'Hello there' },
  });
}

beforeEach(() => {
  state.member = memberResult({ name: 'Jen Lancaster', jobTitle: 'Guest Services Associate' });
  state.mutation = mutationResult();
  recaptcha.getRecaptchaToken.mockReset().mockResolvedValue('v3-token');
});

describe('staff-contact widget App', () => {
  it('shows a misconfigured notice when no contact GUID is supplied', () => {
    render(<App config={config({ contactGuid: '' })} />);
    expect(screen.getByText('Contact form unavailable')).toBeInTheDocument();
  });

  it('renders the staff member name, job title, and form', () => {
    render(<App config={config()} />);
    expect(screen.getByText('Jen Lancaster')).toBeInTheDocument();
    expect(screen.getByText('Guest Services Associate')).toBeInTheDocument();
    expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
  });

  it('shows a not-found notice when the GUID does not resolve', () => {
    state.member = memberResult(null, { isError: true });
    render(<App config={config()} />);
    expect(screen.getByText('Staff member not found')).toBeInTheDocument();
  });

  it('mints a reCAPTCHA v3 token on submit and includes it in the request', async () => {
    render(<App config={config()} />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    const mutation = state.mutation as { mutate: ReturnType<typeof vi.fn> };
    await waitFor(() => expect(mutation.mutate).toHaveBeenCalledTimes(1));
    expect(recaptcha.getRecaptchaToken).toHaveBeenCalledWith(SITE_KEY, 'staff_contact');
    expect(mutation.mutate).toHaveBeenCalledWith({
      contactGuid: GUID,
      senderName: 'Samantha Halpin',
      senderEmail: 'samantha@example.com',
      message: 'Hello there',
      recaptchaToken: 'v3-token',
    });
  });

  it('shows an error and does not submit when reCAPTCHA fails', async () => {
    recaptcha.getRecaptchaToken.mockReset().mockRejectedValue(new Error('blocked'));
    render(<App config={config()} />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not verify/i));
    const mutation = state.mutation as { mutate: ReturnType<typeof vi.fn> };
    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it('shows a confirmation after a successful send', () => {
    state.mutation = mutationResult({ isSuccess: true });
    render(<App config={config()} />);
    expect(screen.getByText('Message sent')).toBeInTheDocument();
  });
});
