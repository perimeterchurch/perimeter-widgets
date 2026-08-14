/// <reference types="@testing-library/jest-dom/vitest" />
import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../src/app';
import { StaffContactConfigSchema, type StaffContactConfig } from '../src/types';

const GUID = '641f26fa-12c2-48b7-8392-81e6c02a76bb';

/** Mutable hook state the mocks read; reset before each test. */
const state = vi.hoisted<{ member: unknown; mutation: unknown }>(() => ({
  member: undefined,
  mutation: undefined,
}));

vi.mock('@perimeter/api-hooks', () => ({
  useStaffMember: () => state.member,
  useSubmitStaffContact: () => state.mutation,
}));

// The real Recaptcha loads Google's script; stub it with a button that "solves".
vi.mock('../src/components/Recaptcha', () => ({
  Recaptcha: React.forwardRef(
    ({ onChange }: { onChange: (t: string | null) => void }, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({ reset: () => onChange(null) }), [onChange]);
      return (
        <button type="button" data-testid="solve" onClick={() => onChange('tok-123')}>
          solve
        </button>
      );
    },
  ),
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
  return StaffContactConfigSchema.parse({ contactGuid: GUID, ...overrides });
}

beforeEach(() => {
  state.member = memberResult({ name: 'Jen Lancaster', jobTitle: 'Guest Services Associate' });
  state.mutation = mutationResult();
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

  it('submits the form with the reCAPTCHA token once solved', () => {
    render(<App config={config()} />);
    fireEvent.change(screen.getByLabelText('Your Name'), {
      target: { value: 'Samantha Halpin' },
    });
    fireEvent.change(screen.getByLabelText('Your Email'), {
      target: { value: 'samantha@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello there' },
    });
    fireEvent.click(screen.getByTestId('solve'));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    const mutation = state.mutation as { mutate: ReturnType<typeof vi.fn> };
    expect(mutation.mutate).toHaveBeenCalledTimes(1);
    expect(mutation.mutate).toHaveBeenCalledWith(
      {
        contactGuid: GUID,
        senderName: 'Samantha Halpin',
        senderEmail: 'samantha@example.com',
        message: 'Hello there',
        recaptchaToken: 'tok-123',
      },
      expect.anything(),
    );
  });

  it('blocks submission until the reCAPTCHA is solved', () => {
    render(<App config={config()} />);
    fireEvent.change(screen.getByLabelText('Your Name'), {
      target: { value: 'Sam' },
    });
    fireEvent.change(screen.getByLabelText('Your Email'), {
      target: { value: 'sam@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hi' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/reCAPTCHA/);
    const mutation = state.mutation as { mutate: ReturnType<typeof vi.fn> };
    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it('shows a confirmation after a successful send', () => {
    state.mutation = mutationResult({ isSuccess: true });
    render(<App config={config()} />);
    expect(screen.getByText('Message sent')).toBeInTheDocument();
  });
});
