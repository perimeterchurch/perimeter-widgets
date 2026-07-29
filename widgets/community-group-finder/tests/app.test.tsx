/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app';
import { CommunityGroupFinderConfigSchema, type CommunityGroupFinderConfig } from '../src/types';

/** Minimal UseQueryResult-shaped object wrapping the API envelope. */
function groupsResult(groups: unknown[] | null, overrides: Record<string, unknown> = {}) {
  return {
    data: groups === null ? undefined : { success: true, data: { groups } },
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    ...overrides,
  };
}

const GROUP = {
  id: 14392,
  name: 'Alpharetta-Milton: Bob and Cindy Heath Community Group',
  description: 'Looking for a small community of friends who love Jesus?',
  neighborhood: 'Alpharetta-Milton',
  neighborhoodId: 5,
  groupFocus: 'Blended Group',
  groupFocusId: 7,
  lifeStage: 'Blended Ages',
  lifeStageId: 4,
  meetingDay: 'Sunday',
  meetingDayId: 1,
  meetingTime: '17:00:00',
  meetingTimeOfDay: 'evening',
  meetingFrequency: 'Biweekly',
  meetingFrequencyId: 3,
  city: 'Alpharetta',
  state: 'GA',
  meetsOnline: false,
  isFull: false,
  // Far enough out that the "Starts:" line stays visible as the suite ages.
  startDate: '2099-08-16T17:00:00',
  participantCount: null,
  targetSize: null,
};

const FACETS = {
  neighborhoods: [
    { id: 5, name: 'Alpharetta-Milton' },
    { id: 1, name: 'Johns Creek' },
  ],
  focuses: [{ id: 7, name: 'Blended Group' }],
  lifeStages: [{ id: 4, name: 'Blended Ages' }],
  meetingDays: [{ id: 1, name: 'Sunday' }],
  meetingTimes: [{ id: 'evening', name: 'Evening' }],
};

const hooks = vi.hoisted<{ groups: unknown; params: unknown }>(() => ({
  groups: undefined,
  params: undefined,
}));

vi.mock('@perimeter/api-hooks', () => ({
  useCommunityGroups: (params: unknown) => {
    hooks.params = params;
    return hooks.groups;
  },
  useCommunityGroupFacets: () => ({
    data: { success: true, data: FACETS },
    isLoading: false,
    isError: false,
  }),
}));

function config(overrides: Record<string, unknown> = {}): CommunityGroupFinderConfig {
  return CommunityGroupFinderConfigSchema.parse(overrides);
}

function renderApp(overrides: Record<string, unknown> = {}) {
  return render(<App config={config(overrides)} />);
}

describe('community-group-finder App', () => {
  it('renders the group name, location, schedule, and start date', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp();
    expect(
      screen.getByText('Alpharetta-Milton: Bob and Cindy Heath Community Group'),
    ).toBeInTheDocument();
    expect(screen.getByText('Alpharetta, GA')).toBeInTheDocument();
    expect(screen.getByText('Sundays @ 5:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Starts: Sun, Aug 16, 2099')).toBeInTheDocument();
  });

  it('hides the start date for a group that already began', () => {
    hooks.groups = groupsResult([{ ...GROUP, startDate: '2014-02-09T00:00:00' }]);
    renderApp();
    expect(screen.queryByText(/^Starts:/)).not.toBeInTheDocument();
  });

  it('links See Details to the group-details page for that group', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp();
    expect(screen.getByRole('link', { name: 'See Details' })).toHaveAttribute(
      'href',
      'https://www.perimeter.org/group-details/?id=14392',
    );
  });

  it('badges a group at capacity instead of hiding it', () => {
    hooks.groups = groupsResult([{ ...GROUP, isFull: true }]);
    renderApp();
    expect(screen.getByText('Group Is Full')).toBeInTheDocument();
    expect(screen.getByText(GROUP.name)).toBeInTheDocument();
  });

  it('keeps full groups by default, sending no includeFull override', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp();
    expect(hooks.params).not.toHaveProperty('includeFull');
  });

  it('asks the endpoint to drop full groups when showFullGroups is off', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ showFullGroups: false });
    expect(hooks.params).toMatchObject({ includeFull: 'false' });
  });

  it('asks the endpoint to count pending inquiries only when configured', () => {
    hooks.groups = groupsResult([GROUP]);
    const first = renderApp();
    expect(hooks.params).not.toHaveProperty('countGroupInquiries');
    first.unmount();

    renderApp({ countGroupInquiries: true });
    expect(hooks.params).toMatchObject({ countGroupInquiries: 'true' });
  });

  it('asks the endpoint to drop future groups when showFutureGroups is off', () => {
    hooks.groups = groupsResult([GROUP]);
    const first = renderApp();
    expect(hooks.params).not.toHaveProperty('showFutureGroups');
    first.unmount();

    renderApp({ showFutureGroups: false });
    expect(hooks.params).toMatchObject({ showFutureGroups: 'false' });
  });

  it('requests the configured group type', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ groupTypeId: 10 });
    expect(hooks.params).toMatchObject({ groupTypeId: 10 });
  });

  it('renders the loading, error, and empty states', () => {
    hooks.groups = groupsResult(null, { isLoading: true, isSuccess: false });
    const loading = renderApp();
    expect(screen.queryByText(GROUP.name)).not.toBeInTheDocument();
    loading.unmount();

    hooks.groups = groupsResult(null, { isError: true, isSuccess: false });
    const errored = renderApp();
    expect(screen.getByText(/Unable to load community groups/)).toBeInTheDocument();
    errored.unmount();

    hooks.groups = groupsResult([]);
    renderApp({ emptyMessage: 'Nothing here' });
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('truncates a long description at the configured limit', () => {
    hooks.groups = groupsResult([{ ...GROUP, description: 'word '.repeat(200) }]);
    renderApp({ descriptionLimit: 40 });
    const excerpt = screen.getByText(/word.*…$/);
    expect(excerpt.textContent?.length ?? 0).toBeLessThanOrEqual(41);
  });

  it('caps the list at maxGroups', () => {
    hooks.groups = groupsResult([GROUP, { ...GROUP, id: 2, name: 'Second Group' }]);
    renderApp({ maxGroups: 1 });
    expect(screen.queryByText('Second Group')).not.toBeInTheDocument();
  });

  it('omits the banner when showImages is off', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ showImages: false });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('hides the filter panel when showFilters is off', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ showFilters: false });
    expect(screen.queryByRole('button', { name: /Filters/ })).not.toBeInTheDocument();
  });
});

describe('community-group-finder filters', () => {
  it('starts with the advanced panel collapsed and expands on click', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp();

    expect(screen.queryByText('Meeting Days')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Show Filters/ }));
    expect(screen.getByText('Meeting Days')).toBeInTheDocument();
    expect(screen.getByText('Meeting Times')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide Filters/ })).toBeInTheDocument();
  });

  it('starts expanded when advancedOpen is set', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ advancedOpen: true });
    expect(screen.getByText('City')).toBeInTheDocument();
  });

  it('sends checked meeting days to the endpoint as a comma list', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp({ advancedOpen: true });

    await user.click(screen.getByLabelText('Su'));
    await user.click(screen.getByLabelText('We'));

    expect(hooks.params).toMatchObject({ meetingDayIds: '1,4' });
  });

  it('sends checked meeting-time buckets to the endpoint', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp({ advancedOpen: true });

    await user.click(screen.getByLabelText('Evening'));

    expect(hooks.params).toMatchObject({ meetingTimes: 'evening' });
  });

  it('sends the keyword search', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp({ advancedOpen: true });

    await user.type(screen.getByLabelText('Search community groups'), 'hiking');

    expect(hooks.params).toMatchObject({ keyword: 'hiking' });
  });

  it('labels the city and ages filters by those names rather than MP terms', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ advancedOpen: true });
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('Ages')).toBeInTheDocument();
    expect(screen.queryByText('Neighborhood')).not.toBeInTheDocument();
    expect(screen.queryByText('Life Stage')).not.toBeInTheDocument();
  });

  it('has no city-or-postal-code box', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ advancedOpen: true });
    expect(screen.queryByLabelText('City or Postal Code')).not.toBeInTheDocument();
  });

  it('omits empty filters from the query entirely', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp();
    expect(hooks.params).not.toHaveProperty('keyword');
    expect(hooks.params).not.toHaveProperty('meetingDayIds');
  });

  it('clears every filter back to empty', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp({ advancedOpen: true });

    await user.click(screen.getByLabelText('Su'));
    await user.click(screen.getByRole('button', { name: 'Clear All' }));

    expect(screen.getByLabelText('Su')).not.toBeChecked();
    expect(hooks.params).not.toHaveProperty('meetingDayIds');
  });

  it('hides the City filter and pins the ids when locked to a city', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ advancedOpen: true, neighborhoodIds: '5' });
    expect(screen.queryByText('City')).not.toBeInTheDocument();
    expect(hooks.params).toMatchObject({ neighborhoodIds: '5' });
  });

  it('badges the number of active filters while the panel is collapsed', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp({ advancedOpen: true });

    await user.click(screen.getByLabelText('Su'));
    await user.click(screen.getByLabelText('Evening'));
    await user.click(screen.getByRole('button', { name: /Hide Filters/ }));

    // Two filters active (days, times) — counted per filter, not per value.
    expect(screen.getByRole('button', { name: /Show Filters 2/ })).toBeInTheDocument();
  });
});
