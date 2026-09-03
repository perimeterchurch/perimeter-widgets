/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/app';
import { FrontierPledgeConfigSchema, type FrontierPledgeConfig } from '../src/types';

/** Mutable mutation state the mocked hook reads; reset before each test. */
const state = vi.hoisted<{ mutation: unknown }>(() => ({ mutation: undefined }));

vi.mock('@perimeter/api-hooks', () => ({
  useCreatePledge: () => state.mutation,
}));

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

function config(overrides: Record<string, unknown> = {}): FrontierPledgeConfig {
  return FrontierPledgeConfigSchema.parse(overrides);
}

function fillForm(over: Partial<Record<string, string>> = {}): void {
  const fields: Record<string, string> = {
    'First Name': 'Samantha',
    'Last Name': 'Halpin',
    Email: 'samantha@example.com',
    Mobile: '770-555-0134',
    'Total 3-Year Pledge Amount': '12500',
    ...over,
  };
  for (const [label, value] of Object.entries(fields)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

function mutation() {
  return state.mutation as { mutate: ReturnType<typeof vi.fn>; reset: ReturnType<typeof vi.fn> };
}

beforeEach(() => {
  state.mutation = mutationResult();
});

describe('frontier-pledge widget App', () => {
  it('renders the configured heading and period', () => {
    render(<App config={config({ heading: 'My 5-Year Pledge', period: 'Jan 2030 - Dec 2034' })} />);
    expect(screen.getByText('My 5-Year Pledge')).toBeInTheDocument();
    expect(screen.getByText('Jan 2030 - Dec 2034')).toBeInTheDocument();
  });

  it('defaults to the Frontier campaign heading and period', () => {
    render(<App config={config()} />);
    expect(screen.getByText('My 3-Year Pledge')).toBeInTheDocument();
    expect(screen.getByText('Jan 2026 - Dec 2028')).toBeInTheDocument();
  });

  it('submits the trimmed pledge, with the spouse folded into the MP note', () => {
    render(<App config={config()} />);
    fillForm({ 'First Name': '  Samantha  ' });
    fireEvent.change(screen.getByLabelText('Spouse Name (Optional)'), {
      target: { value: 'Drew' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Make Pledge' }));

    expect(mutation().mutate).toHaveBeenCalledTimes(1);
    const body = mutation().mutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).toMatchObject({
      firstName: 'Samantha',
      lastName: 'Halpin',
      email: 'samantha@example.com',
      phone: '770-555-0134',
      pledge: 12500,
      spouse: 'Drew',
    });
    expect(body.notes).toContain('Spouse: Drew');
  });

  it('omits spouse from the request when it is left blank', () => {
    render(<App config={config()} />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Make Pledge' }));

    const body = mutation().mutate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).not.toHaveProperty('spouse');
    expect(body.notes).not.toContain('Spouse:');
  });

  it('blocks submission and shows a message for each invalid field', () => {
    render(<App config={config()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Make Pledge' }));

    expect(mutation().mutate).not.toHaveBeenCalled();
    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Mobile number is required')).toBeInTheDocument();
    expect(screen.getByText('Please enter a pledge amount')).toBeInTheDocument();
  });

  it('rejects a zero pledge and a malformed email', () => {
    render(<App config={config()} />);
    fillForm({ Email: 'not-an-email', 'Total 3-Year Pledge Amount': '0' });
    fireEvent.click(screen.getByRole('button', { name: 'Make Pledge' }));

    expect(mutation().mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount greater than 0')).toBeInTheDocument();
  });

  it("clears a field's message as soon as that field is edited", async () => {
    render(<App config={config()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Make Pledge' }));
    expect(screen.getByText('First name is required')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Samantha' } });
    // `waitFor`, not a bare assertion: the message animates out, so it lingers
    // in the DOM for the length of the exit transition.
    await waitFor(() =>
      expect(screen.queryByText('First name is required')).not.toBeInTheDocument(),
    );
    // Untouched fields keep theirs.
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
  });

  it('groups the amount on blur and ungroups it on focus', () => {
    render(<App config={config()} />);
    const amount = screen.getByLabelText('Total 3-Year Pledge Amount');
    fireEvent.change(amount, { target: { value: '12500' } });
    fireEvent.blur(amount);
    expect(amount).toHaveValue('12,500.00');
    fireEvent.focus(amount);
    expect(amount).toHaveValue('12500.00');
  });

  it('shows a busy submit button while the pledge is in flight', () => {
    state.mutation = mutationResult({ isPending: true });
    render(<App config={config()} />);
    const button = screen.getByRole('button', { name: /Submitting/ });
    expect(button).toBeDisabled();
  });

  it('surfaces a dismissible error when the pledge fails', () => {
    state.mutation = mutationResult({ isError: true });
    render(<App config={config()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Error submitting pledge');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(mutation().reset).toHaveBeenCalled();
  });

  it('covers the form with a confirmation once the pledge is recorded', () => {
    state.mutation = mutationResult({ isSuccess: true });
    render(<App config={config({ accountUrl: 'https://example.org/account/' })} />);

    expect(
      screen.getByText('Thank you for your pledge to the Frontier Campaign!'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Perimeter' })).toHaveAttribute(
      'href',
      'https://example.org/account/',
    );
  });

  it('makes the covered form inert so it cannot be tabbed into behind the confirmation', () => {
    state.mutation = mutationResult({ isSuccess: true });
    const { container } = render(<App config={config()} />);
    expect(container.querySelector('form')).toHaveAttribute('inert');
  });

  it('resets the form when the confirmation is dismissed', () => {
    state.mutation = mutationResult({ isSuccess: true });
    render(<App config={config()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Make another pledge' }));
    expect(mutation().reset).toHaveBeenCalled();
  });
});
