/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SermonDetail } from '../../src/components/sermons/SermonDetail';
import { SermonsConfigSchema, type SermonsConfig } from '../../src/types';

function queryResult(envelope: unknown) {
  return {
    data: envelope,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
  };
}

const sermon = {
  id: 42,
  title: 'Grace Abounds',
  date: '2025-01-05',
  description: '',
  shortDescription: '',
  scriptureLinks: '',
  speaker: { id: 1, name: 'Pastor Jane' },
  series: { id: 9, title: 'Romans' },
  book: { id: 2, name: 'Romans' },
  bannerUrl: null,
  links: [],
};

vi.mock('@perimeter/api-hooks', () => ({
  useSermonDetail: () => queryResult({ success: true, data: sermon }),
  useSermons: () =>
    queryResult({
      success: true,
      data: { sermons: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
    }),
}));

const config: SermonsConfig = SermonsConfigSchema.parse({});

describe('SermonDetail share link', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it('renders a share/copy-link control', () => {
    render(<SermonDetail id={42} config={config} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: /copy link|share/i })).toBeInTheDocument();
  });

  it('copies the current location href to the clipboard when clicked', () => {
    render(<SermonDetail id={42} config={config} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /copy link|share/i }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });
});
