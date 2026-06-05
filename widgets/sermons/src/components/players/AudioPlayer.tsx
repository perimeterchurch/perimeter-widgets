import { useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useMediaPlayer } from '../../hooks/use-media-player';
import { formatTime } from '../../lib/format';

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function AudioPlayer({ url }: { url: string }) {
  const {
    mediaRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    togglePlay,
    seek,
    seekTo,
    setVolume,
    setPlaybackRate,
  } = useMediaPlayer();

  const cycleSpeed = useCallback(() => {
    const currentIndex = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
    const nextIndex = (currentIndex + 1) % SPEEDS.length;
    setPlaybackRate(SPEEDS[nextIndex]!);
  }, [playbackRate, setPlaybackRate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(-5);
          break;
        default:
          break;
      }
    },
    [togglePlay, seek],
  );

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      tabIndex={0}
      role="application"
      aria-label="Audio player"
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full max-w-[500px] items-center gap-3 rounded-xl bg-muted px-5 py-3 shadow-lg">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg transition-colors hover:bg-primary/90"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Seek"
        />
        <span className="whitespace-nowrap text-xs text-muted-fg">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setVolume(volume === 0 ? 1 : 0)}
            className="text-muted-fg transition-colors hover:text-fg"
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-border accent-primary"
            aria-label="Volume"
          />
        </div>
        <button
          type="button"
          onClick={cycleSpeed}
          className="rounded px-1.5 py-0.5 text-xs font-medium text-muted-fg transition-colors hover:bg-muted hover:text-fg"
          aria-label={`Playback speed ${playbackRate}x`}
        >
          {playbackRate}x
        </button>
      </div>
      <audio ref={mediaRef} src={url} preload="metadata" className="hidden" />
    </div>
  );
}
