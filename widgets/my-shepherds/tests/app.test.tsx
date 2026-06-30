/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/app';
import type { Shepherd } from '@perimeter/api-hooks';

// The App pulls live data through @perimeter/api-hooks, which needs an
// ApiClient + QueryClient context the test doesn't provide. Mock the hook so
// each test can drive a specific query state deterministically.
const useShepherds = vi.fn();
vi.mock('@perimeter/api-hooks', () => ({
  useShepherds: () => useShepherds() as unknown,
}));

function envelope(shepherds: Shepherd[]) {
  return { success: true as const, data: { shepherds } };
}

const sampleShepherd: Shepherd = {
  Elder_Name: 'Davon Stack',
  Mobile_Phone: '678-751-9506',
  Email_Address: 'davons@perimeter.org',
  Elder_Type: 'Shepherd',
  Elder_Photo_URL: 'https://example.com/davon.jpg',
};

beforeEach(() => {
  useShepherds.mockReset();
});

describe('my-shepherds widget App', () => {
  it('renders the configured title heading', () => {
    useShepherds.mockReturnValue({ data: envelope([]), isPending: false, isError: false });
    render(<App config={{ title: 'My Shepherds' }} />);
    expect(screen.getByRole('heading', { name: 'My Shepherds' })).toBeInTheDocument();
  });

  it('renders a card per shepherd with name, type and contact details', () => {
    useShepherds.mockReturnValue({
      data: envelope([sampleShepherd]),
      isPending: false,
      isError: false,
    });
    render(<App config={{ title: 'My Shepherds' }} />);
    expect(screen.getByText('Davon Stack')).toBeInTheDocument();
    expect(screen.getByText('Shepherd')).toBeInTheDocument();
    expect(screen.getByText('678-751-9506')).toBeInTheDocument();
    expect(screen.getByText('davons@perimeter.org')).toBeInTheDocument();
  });

  it('wires Call/Text/Email actions to tel:/sms:/mailto: links', () => {
    useShepherds.mockReturnValue({
      data: envelope([sampleShepherd]),
      isPending: false,
      isError: false,
    });
    render(<App config={{ title: 'My Shepherds' }} />);
    expect(screen.getByRole('link', { name: /call/i })).toHaveAttribute('href', 'tel:6787519506');
    expect(screen.getByRole('link', { name: /text/i })).toHaveAttribute('href', 'sms:6787519506');
    expect(screen.getByRole('link', { name: /email/i })).toHaveAttribute(
      'href',
      'mailto:davons@perimeter.org',
    );
  });

  it('disables contact actions when the underlying field is missing', () => {
    useShepherds.mockReturnValue({
      data: envelope([{ ...sampleShepherd, Mobile_Phone: null, Email_Address: null }]),
      isPending: false,
      isError: false,
    });
    render(<App config={{ title: 'My Shepherds' }} />);
    expect(screen.queryByRole('link')).toBeNull();
    for (const name of [/call/i, /text/i, /email/i]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('shows an empty state when no shepherds are assigned', () => {
    useShepherds.mockReturnValue({ data: envelope([]), isPending: false, isError: false });
    render(<App config={{ title: 'My Shepherds' }} />);
    expect(screen.getByText(/no shepherds assigned/i)).toBeInTheDocument();
  });

  it('shows an error state when the request fails', () => {
    useShepherds.mockReturnValue({ data: undefined, isPending: false, isError: true });
    render(<App config={{ title: 'My Shepherds' }} />);
    expect(screen.getByText(/couldn.t load your shepherds/i)).toBeInTheDocument();
  });
});
