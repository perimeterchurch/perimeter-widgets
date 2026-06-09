/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaTabs } from '../../../src/components/players/MediaTabs';
import type { SermonLink } from '../../../src/types';

describe('MediaTabs no-media affordance', () => {
  it('renders a "no media available" note when the sermon has zero links', () => {
    render(<MediaTabs links={[]} />);
    expect(screen.getByText(/no media available/i)).toBeInTheDocument();
  });

  it('renders the tab bar (not the note) when at least one link exists', () => {
    const links: SermonLink[] = [
      { mediaType: 'audio', url: 'https://example.com/audio.mp3' } as SermonLink,
    ];
    render(<MediaTabs links={links} />);
    expect(screen.queryByText(/no media available/i)).toBeNull();
    expect(screen.getByText('Listen')).toBeInTheDocument();
  });

  it('renders the media switcher as the shared SegmentedTabs control (role=tablist + a tab per medium)', () => {
    // Matches the sermons/series SermonTabs look — SegmentedTabs renders a
    // role="tablist" of role="tab" buttons (not the old Tabs compound).
    const links: SermonLink[] = [
      { mediaType: 'video', url: 'https://example.com/v.m3u8' } as SermonLink,
      { mediaType: 'audio', url: 'https://example.com/a.mp3' } as SermonLink,
      { mediaType: 'document', url: 'https://example.com/notes.pdf' } as SermonLink,
    ];
    render(<MediaTabs links={links} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /watch/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /listen/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pdf/i })).toBeInTheDocument();
  });
});
