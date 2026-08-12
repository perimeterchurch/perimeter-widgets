/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type * as ApiHooks from '@perimeter/api-hooks';
import { ApiError } from '@perimeter/api-hooks';
import { App } from '../src/app';

// App pulls live data through @perimeter/api-hooks, which needs an ApiClient +
// Query context the test doesn't provide. Mock just useGivingHistory (keeping
// the real ApiError, which the error state checks with `instanceof`). The mock
// fn is created via vi.hoisted so it exists when the hoisted vi.mock factory runs.
const { useGivingHistoryMock } = vi.hoisted(() => ({ useGivingHistoryMock: vi.fn() }));
vi.mock('@perimeter/api-hooks', async (importActual) => {
  const actual = await importActual<typeof ApiHooks>();
  return { ...actual, useGivingHistory: useGivingHistoryMock };
});

function queryResult(partial: Record<string, unknown>) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...partial,
  };
}

function envelope(items: unknown[]) {
  return { success: true, data: { items }, meta: { count: items.length } };
}

const sampleItems = [
  {
    distributionId: 1,
    donationId: 1,
    date: '2025-12-01T00:00:00.000-05:00',
    amount: 70,
    donorName: 'Sam Giver',
    softCreditSource: null,
    paymentType: 'Credit Card',
    programName: 'Missions',
  },
  {
    distributionId: 2,
    donationId: 2,
    date: '2026-02-15T00:00:00.000-05:00',
    amount: 25,
    donorName: 'Pat Giver',
    softCreditSource: null,
    paymentType: 'Cash',
    programName: 'Tithes',
  },
];

function renderApp() {
  return render(<App config={{ title: 'My Giving History' }} />);
}

beforeEach(() => {
  useGivingHistoryMock.mockReset();
});

describe('my-giving-history App', () => {
  it('shows a loading state while fetching', () => {
    useGivingHistoryMock.mockReturnValue(queryResult({ isLoading: true }));
    const { container } = renderApp();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('shows a session-expired message on a 401', () => {
    useGivingHistoryMock.mockReturnValue(
      queryResult({ isError: true, error: new ApiError(401, 'Unauthorized') }),
    );
    renderApp();
    expect(screen.getByText('Your session has expired')).toBeInTheDocument();
  });

  it('shows a generic error on a non-auth failure', () => {
    useGivingHistoryMock.mockReturnValue(
      queryResult({ isError: true, error: new ApiError(500, 'Server error') }),
    );
    renderApp();
    expect(screen.getByText('Unable to load giving history')).toBeInTheDocument();
  });

  it('shows an empty state when there is no giving history', () => {
    useGivingHistoryMock.mockReturnValue(queryResult({ isSuccess: true, data: envelope([]) }));
    renderApp();
    expect(screen.getByText('No giving history yet')).toBeInTheDocument();
  });

  it('renders the table, chart, and total for returned gifts', () => {
    useGivingHistoryMock.mockReturnValue(
      queryResult({ isSuccess: true, data: envelope(sampleItems) }),
    );
    renderApp();
    // Donor names also appear as filter <option>s, so scope to the table.
    const table = screen.getByLabelText('Giving history');
    expect(within(table).getByText('Sam Giver')).toBeInTheDocument();
    expect(within(table).getByText('Pat Giver')).toBeInTheDocument();
    expect(screen.getByLabelText('Giving by year')).toBeInTheDocument();
    expect(screen.getByText('2 gifts · $95.00 total')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeInTheDocument();
  });

  it('names the fund under the donor for a soft-credited gift', () => {
    useGivingHistoryMock.mockReturnValue(
      queryResult({
        isSuccess: true,
        data: envelope([
          {
            ...sampleItems[0],
            softCreditSource: 'Fidelity Charitable Gift Fund Foundation',
          },
        ]),
      }),
    );
    renderApp();

    const table = screen.getByLabelText('Giving history');
    // Credited to the member, with the giving fund named beneath.
    expect(within(table).getByText('Sam Giver')).toBeInTheDocument();
    expect(
      within(table).getByText('via Fidelity Charitable Gift Fund Foundation'),
    ).toBeInTheDocument();
  });

  it('filters the table when a year is selected', () => {
    useGivingHistoryMock.mockReturnValue(
      queryResult({ isSuccess: true, data: envelope(sampleItems) }),
    );
    renderApp();

    const yearSelect = screen.getByLabelText('Year');
    fireEvent.change(yearSelect, { target: { value: '2026' } });

    const table = screen.getByLabelText('Giving history');
    expect(within(table).getByText('Pat Giver')).toBeInTheDocument();
    expect(within(table).queryByText('Sam Giver')).not.toBeInTheDocument();
    expect(screen.getByText('1 gift · $25.00 total')).toBeInTheDocument();
  });
});
