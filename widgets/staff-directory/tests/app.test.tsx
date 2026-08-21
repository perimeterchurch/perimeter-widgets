/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app';
import { StaffDirectoryConfigSchema, type StaffDirectoryConfig } from '../src/types';

/** Minimal UseQueryResult-shaped object wrapping the API envelope. */
function staffResult(staff: unknown[] | null, overrides: Record<string, unknown> = {}) {
  return {
    data: staff === null ? undefined : { success: true, data: { staff } },
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    ...overrides,
  };
}

const MEMBER = {
  personnelId: 5785,
  contactId: 814346,
  contactGuid: '3c4afc8f-8d44-478f-8269-807441aff768',
  name: 'Adriel Abella',
  firstName: 'Adriel',
  lastName: 'Abella',
  nickname: 'Adriel',
  photoUrl: 'https://mp.example.org/api/files/photo-guid',
  personnelType: 'Part Time Not Exempt',
  personnelTypeId: 3,
  startDate: '2024-08-26T00:00:00',
  positions: [
    {
      id: 8293,
      title: 'Communications Studio Manager',
      ministry: 'Communications',
      ministryId: 32,
      isDepartmentHead: false,
      isDivisionHead: false,
      startDate: '2024-08-26T00:00:00',
    },
  ],
};

/** Someone holding two roles — what the legacy widget hardcoded a case for. */
const TWO_ROLE_MEMBER = {
  ...MEMBER,
  personnelId: 5602,
  contactGuid: '3a0e6ec2-7520-4b9e-b8c8-1fc5810f6553',
  name: 'Stephen Ready',
  firstName: 'Stephen',
  lastName: 'Ready',
  nickname: 'Stephen',
  positions: [
    {
      id: 1,
      title: 'Executive Director of Leadership Development',
      ministry: 'Leadership Development',
      ministryId: 13,
      isDepartmentHead: false,
      isDivisionHead: false,
      startDate: '2015-01-01T00:00:00',
    },
    {
      id: 2,
      title: "Director of Men's Ministry",
      ministry: "Men's Ministry",
      ministryId: 60,
      isDepartmentHead: false,
      isDivisionHead: false,
      startDate: '2020-01-01T00:00:00',
    },
  ],
};

const FACETS = {
  ministries: [
    { id: 32, name: 'Communications' },
    { id: 3, name: 'Accounting' },
  ],
  personnelTypes: [{ id: 3, name: 'Part Time Not Exempt' }],
};

const hooks = vi.hoisted<{
  staff: unknown;
  params: unknown;
  facetParams: unknown;
  facetsEnabled: unknown;
}>(() => ({
  staff: undefined,
  params: undefined,
  facetParams: undefined,
  facetsEnabled: undefined,
}));

vi.mock('@perimeter/api-hooks', () => ({
  useStaffDirectory: (params: unknown) => {
    hooks.params = params;
    return hooks.staff;
  },
  useStaffDirectoryFacets: (params: unknown, options: { enabled?: boolean } | undefined) => {
    hooks.facetParams = params;
    hooks.facetsEnabled = options?.enabled;
    return {
      data: { success: true, data: FACETS },
      isLoading: false,
      isError: false,
    };
  },
}));

function config(overrides: Record<string, unknown> = {}): StaffDirectoryConfig {
  return StaffDirectoryConfigSchema.parse(overrides);
}

function renderApp(overrides: Record<string, unknown> = {}) {
  return render(<App config={config(overrides)} />);
}

beforeEach(() => {
  hooks.staff = staffResult([MEMBER]);
  hooks.params = undefined;
  hooks.facetParams = undefined;
  hooks.facetsEnabled = undefined;
});

describe('staff-directory App', () => {
  it('renders the heading, intro, name, and title', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'All Staff' })).toBeInTheDocument();
    expect(
      screen.getByText('Search staff members by name, keyword, or department.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Adriel Abella' })).toBeInTheDocument();
    expect(screen.getByText('Communications Studio Manager')).toBeInTheDocument();
  });

  it('omits the heading and intro when configured blank', () => {
    renderApp({ title: '', intro: '' });
    expect(screen.queryByRole('heading', { name: 'All Staff' })).not.toBeInTheDocument();
    expect(
      screen.queryByText('Search staff members by name, keyword, or department.'),
    ).not.toBeInTheDocument();
  });

  it('links a card to the contact page by Contact GUID, not Employee ID', () => {
    renderApp();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://www.perimeter.org/staff-contact/?contactGuid=3c4afc8f-8d44-478f-8269-807441aff768',
    );
  });

  it('sends the card link to a configured targetUrl instead', () => {
    renderApp({ targetUrl: 'https://example.org/team/?guid=' });
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://example.org/team/?guid=3c4afc8f-8d44-478f-8269-807441aff768',
    );
  });

  it('renders an unlinked card when linking is off', () => {
    renderApp({ linkCards: false });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Adriel Abella' })).toBeInTheDocument();
  });

  it('renders an unlinked card when MP has no Contact GUID', () => {
    // An anchor here would promise a contact page that cannot resolve anyone.
    hooks.staff = staffResult([{ ...MEMBER, contactGuid: null }]);
    renderApp();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Adriel Abella' })).toBeInTheDocument();
  });

  it('shows both titles for someone holding two positions', () => {
    hooks.staff = staffResult([TWO_ROLE_MEMBER]);
    renderApp();
    expect(
      screen.getByText("Executive Director of Leadership Development · Director of Men's Ministry"),
    ).toBeInTheDocument();
  });

  it('hides titles when showPositions is off', () => {
    renderApp({ showPositions: false });
    expect(screen.queryByText('Communications Studio Manager')).not.toBeInTheDocument();
  });

  it('shows the ministry only when asked', () => {
    renderApp();
    expect(screen.queryByText('Communications')).not.toBeInTheDocument();
    renderApp({ showMinistryOnCard: true });
    expect(screen.getByText('Communications')).toBeInTheDocument();
  });

  it('falls back to initials when the person has no photo', () => {
    hooks.staff = staffResult([{ ...MEMBER, photoUrl: null }]);
    renderApp();
    expect(screen.getByText('AA')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('prefers a configured default photo over initials', () => {
    hooks.staff = staffResult([{ ...MEMBER, photoUrl: null }]);
    renderApp({ defaultPhotoUrl: 'https://example.org/default.png' });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.org/default.png');
  });

  it('caps the grid at maxStaff', () => {
    hooks.staff = staffResult([MEMBER, TWO_ROLE_MEMBER]);
    renderApp({ maxStaff: 1 });
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });

  it('passes the typed keyword to the API', async () => {
    renderApp();
    await userEvent.type(screen.getByLabelText('Search staff'), 'abella');
    expect(hooks.params).toMatchObject({ keyword: 'abella' });
  });

  it('omits the keyword entirely when the box is empty', () => {
    // An empty string would still parse as a present-but-unusable filter.
    renderApp();
    expect(hooks.params).not.toHaveProperty('keyword');
  });

  it('locks to configured ministries and hides the dropdown', () => {
    renderApp({ ministryIds: '3,14' });
    expect(hooks.params).toMatchObject({ ministryIds: '3,14' });
    // Locked pages skip the facets request — there is no dropdown to fill.
    expect(hooks.facetsEnabled).toBe(false);
    expect(screen.queryByPlaceholderText('All Departments')).not.toBeInTheDocument();
  });

  it('narrows the dropdown to the configured employment types', () => {
    // The facets request carries the same scope, so the dropdown never offers a
    // ministry that this page's staff do not belong to.
    renderApp({ personnelTypeIds: '1,2' });
    expect(hooks.facetParams).toMatchObject({ personnelTypeIds: '1,2' });
    expect(hooks.params).toMatchObject({ personnelTypeIds: '1,2' });
  });

  it('pins the grid to a configured roster', () => {
    renderApp({ contactIds: '814346, 583177' });
    expect(hooks.params).toMatchObject({ contactIds: '814346,583177' });
  });

  it('drops unusable ids from a config list rather than sending them', () => {
    renderApp({ ministryIds: '3,,abc,-4,0,14' });
    expect(hooks.params).toMatchObject({ ministryIds: '3,14' });
  });

  it('shows a loading grid while the request is in flight', () => {
    hooks.staff = staffResult(null, { isLoading: true, isSuccess: false });
    renderApp();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('shows an error message when the request fails', () => {
    hooks.staff = staffResult(null, { isError: true, isSuccess: false });
    renderApp();
    expect(
      screen.getByText('Unable to load the staff directory. Please try again later.'),
    ).toBeInTheDocument();
  });

  it('distinguishes an empty search from an empty directory', async () => {
    hooks.staff = staffResult([]);
    renderApp();
    // Nothing typed: "no staff" is a data problem, not a failed search.
    expect(screen.getByText('No staff members to show.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Search staff'), 'zzz');
    expect(
      screen.getByText('We couldn’t find any staff members matching your search criteria.'),
    ).toBeInTheDocument();
  });
});
