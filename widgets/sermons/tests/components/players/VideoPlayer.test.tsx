/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

// hls.js does feature detection at import; stub it so the module is inert.
vi.mock('hls.js', () => ({
  default: class {
    static isSupported() {
      return false;
    }
    loadSource = () => {};
    attachMedia = () => {};
    destroy = () => {};
  },
}));

import { VideoPlayer } from '../../../src/components/players/VideoPlayer';

const TEST_URL = 'https://example.com/sermon.mp4';

beforeEach(() => {
  vi.useRealTimers();
});

describe('VideoPlayer focusable container + keyboard', () => {
  it('exposes a focusable container so keyboard handlers can receive keys', () => {
    const { container } = render(<VideoPlayer url={TEST_URL} />);
    const stage = container.querySelector<HTMLDivElement>('[data-testid="video-stage"]');
    expect(stage).not.toBeNull();
    // A negative-or-zero tabIndex makes the div focusable for keydown handling.
    expect(stage!.getAttribute('tabindex')).not.toBeNull();
  });

  it('toggles play/pause on Space and seeks on arrow keys', () => {
    const { container } = render(<VideoPlayer url={TEST_URL} />);
    const stage = container.querySelector<HTMLDivElement>('[data-testid="video-stage"]')!;
    const video = container.querySelector('video') as HTMLVideoElement;

    // Stub the underlying media element so togglePlay/seek operate without a real decoder.
    let playing = false;
    Object.defineProperty(video, 'paused', { get: () => !playing, configurable: true });
    Object.defineProperty(video, 'duration', { value: 100, configurable: true });
    let time = 50;
    Object.defineProperty(video, 'currentTime', {
      get: () => time,
      set: (v: number) => {
        time = v;
      },
      configurable: true,
    });
    const playSpy = vi.fn(() => {
      playing = true;
      return Promise.resolve();
    });
    const pauseSpy = vi.fn(() => {
      playing = false;
    });
    video.play = playSpy;
    video.pause = pauseSpy;

    fireEvent.keyDown(stage, { key: ' ' });
    expect(playSpy).toHaveBeenCalled();

    fireEvent.keyDown(stage, { key: ' ' });
    expect(pauseSpy).toHaveBeenCalled();

    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(time).toBeGreaterThan(50);

    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(time).toBeLessThanOrEqual(55);
  });
});

describe('VideoPlayer paused controls visibility', () => {
  it('keeps controls visible while paused even after the hide timer fires', () => {
    vi.useFakeTimers();
    const { container } = render(<VideoPlayer url={TEST_URL} />);
    const stage = container.querySelector<HTMLDivElement>('[data-testid="video-stage"]')!;

    // Move the mouse to arm the 3s hide timer, then let it fire.
    fireEvent.mouseMove(stage);
    vi.advanceTimersByTime(3500);

    // While paused (default isPlaying=false), the controls bar must remain visible.
    const controls = screen.getByLabelText('Play').closest('div');
    expect(controls?.parentElement?.className ?? '').toContain('opacity-100');
    vi.useRealTimers();
  });
});
