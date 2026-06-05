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
});
