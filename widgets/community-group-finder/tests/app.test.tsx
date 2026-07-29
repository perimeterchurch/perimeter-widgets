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

  it('asks the endpoint to drop full groups when hideFull is set', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ hideFull: true });
    expect(hooks.params).toMatchObject({ includeFull: 'false' });
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
    expect(screen.queryByRole('button', { name: /Advanced/ })).not.toBeInTheDocument();
  });
});

describe('community-group-finder filters', () => {
  it('starts with the advanced panel collapsed and expands on click', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp();

    expect(screen.queryByText('Meeting Days')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Show Advanced/ }));
    expect(screen.getByText('Meeting Days')).toBeInTheDocument();
    expect(screen.getByText('Meeting Times')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide Advanced/ })).toBeInTheDocument();
  });

  it('starts expanded when advancedOpen is set', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ advancedOpen: true });
    expect(screen.getByText('Neighborhood')).toBeInTheDocument();
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

  it('sends the keyword search and the city/postal box', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp({ advancedOpen: true });

    await user.type(screen.getByLabelText('Search community groups'), 'hiking');
    await user.type(screen.getByLabelText('City or Postal Code'), '30005');

    expect(hooks.params).toMatchObject({ keyword: 'hiking', location: '30005' });
  });

  it('omits empty filters from the query entirely', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp();
    expect(hooks.params).not.toHaveProperty('keyword');
    expect(hooks.params).not.toHaveProperty('location');
    expect(hooks.params).not.toHaveProperty('meetingDayIds');
  });

  it('presets the city/postal box from config', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ advancedOpen: true, location: 'Duluth' });
    expect(screen.getByLabelText('City or Postal Code')).toHaveValue('Duluth');
  });

  it('clears filters back to the configured location', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp({ advancedOpen: true, location: 'Duluth' });

    await user.click(screen.getByLabelText('Su'));
    await user.click(screen.getByRole('button', { name: 'Clear All' }));

    expect(screen.getByLabelText('Su')).not.toBeChecked();
    expect(hooks.params).toMatchObject({ location: 'Duluth' });
    expect(hooks.params).not.toHaveProperty('meetingDayIds');
  });

  it('hides the Neighborhood filter and pins the ids when locked to a neighborhood', () => {
    hooks.groups = groupsResult([GROUP]);
    renderApp({ advancedOpen: true, neighborhoodIds: '5' });
    expect(screen.queryByText('Neighborhood')).not.toBeInTheDocument();
    expect(hooks.params).toMatchObject({ neighborhoodIds: '5' });
  });

  it('badges the number of active filters while the panel is collapsed', async () => {
    hooks.groups = groupsResult([GROUP]);
    const user = userEvent.setup();
    renderApp({ advancedOpen: true });

    await user.click(screen.getByLabelText('Su'));
    await user.click(screen.getByLabelText('Evening'));
    await user.click(screen.getByRole('button', { name: /Hide Advanced/ }));

    // Two filters active (days, times) — counted per filter, not per value.
    expect(screen.getByRole('button', { name: /Show Advanced 2/ })).toBeInTheDocument();
  });
});
