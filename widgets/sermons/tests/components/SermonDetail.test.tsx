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

describe('SermonDetail header meta', () => {
  it('links the series and speaker when handlers are given', () => {
    const onSeriesClick = vi.fn();
    const onSpeakerClick = vi.fn();
    render(
      <SermonDetail
        id={42}
        config={config}
        onBack={() => {}}
        onSeriesClick={onSeriesClick}
        onSpeakerClick={onSpeakerClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Romans' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pastor Jane' }));

    expect(onSeriesClick).toHaveBeenCalledWith(9, 'Romans');
    expect(onSpeakerClick).toHaveBeenCalledWith(1, 'Pastor Jane');
  });

  it('shows the series and speaker as plain text without handlers', () => {
    render(<SermonDetail id={42} config={config} onBack={() => {}} />);

    expect(screen.getByText('Pastor Jane')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Romans' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pastor Jane' })).toBeNull();
  });
});

describe('SermonDetail Back button', () => {
  it('shows Back by default, styled like Copy link (square, filled brand blue, white text, icon gap)', () => {
    render(<SermonDetail id={42} config={config} onBack={() => {}} />);
    const back = screen.getByRole('button', { name: /back/i });
    const copy = screen.getByRole('button', { name: /copy link/i });
    for (const button of [back, copy]) {
      expect(button).toHaveClass('rounded-none', 'bg-primary', 'text-white', 'gap-2');
    }
  });

  it('hides Back when hideBack is set (a sermon-details page with its own back link)', () => {
    render(
      <SermonDetail
        id={42}
        config={SermonsConfigSchema.parse({ hideBack: true })}
        onBack={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull();
    // The rest of the page is still there.
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });
});
