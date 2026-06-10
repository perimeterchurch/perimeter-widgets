import { useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { useMediaPlayer } from '../../hooks/use-media-player';
import { formatTime } from '../../lib/format';

function isHlsUrl(url: string): boolean {
  return url.includes('.m3u8');
}

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function VideoPlayer({ url }: { url: string }) {
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Controls auto-hide only while actively playing AND not hovered. When paused
  // (or hovered) they stay pinned so a stopped frame never strands the user.
  const controlsVisible = showControls || !isPlaying || isHovered;

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // MediaTabs unmounts this player on every Watch/Listen/PDF switch — a
  // mouse-move in the prior 3s would otherwise leave a live timer firing into
  // the unmounted component.
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Ignore keys aimed at the inline range sliders (they have their own handling).
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

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    // No optimistic setIsFullscreen here: the fullscreenchange listener above
    // is the single source of truth. requestFullscreen rejects in real embeds
    // (iframes without allowfullscreen, non-gesture calls) and fires
    // fullscreenERROR, not fullscreenchange — an optimistic write would leave
    // the button permanently stuck on 'Exit fullscreen'.
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      // Try container first; fall back to shadow host for shadow DOM compat
      const target =
        el.getRootNode() instanceof ShadowRoot ? (el.getRootNode() as ShadowRoot).host : el;
      target.requestFullscreen().catch(() => {
        // Fullscreen not supported in this context
      });
    }
  }, []);

  // Attach HLS.js for .m3u8 streams; fall back to native for mp4/etc.
  const hlsRef = useRef<Hls | null>(null);
  useEffect(() => {
    const video = mediaRef.current as HTMLVideoElement | null;
    if (!video) return;

    if (isHlsUrl(url)) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari has native HLS support
        video.src = url;
      }
    } else {
      video.src = url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, mediaRef]);

  const cycleSpeed = useCallback(() => {
    const currentIndex = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
    const nextIndex = (currentIndex + 1) % SPEEDS.length;
    setPlaybackRate(SPEEDS[nextIndex]!);
  }, [playbackRate, setPlaybackRate]);

  return (
    <div
      ref={containerRef}
      data-testid="video-stage"
      tabIndex={0}
      role="application"
      aria-label="Video player"
      className="relative flex h-full w-full items-center justify-center bg-black outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowControls(false);
      }}
      onKeyDown={handleKeyDown}
    >
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        className="h-full w-full object-contain"
        preload="metadata"
        onClick={togglePlay}
      />
      <div
        className={`absolute bottom-6 inset-x-0 flex justify-center transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div className="flex w-max max-w-[90vw] items-center gap-3 rounded-xl bg-black/60 px-4 py-2.5 backdrop-blur-md">
          <button
            type="button"
            onClick={togglePlay}
            className="text-white hover:text-white/80"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <span className="whitespace-nowrap text-xs text-white/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="h-1.5 w-40 min-w-24 cursor-pointer appearance-none rounded-full bg-white/30 accent-primary outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Seek"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVolume(volume === 0 ? 1 : 0)}
              className="text-white hover:text-white/80"
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
              className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30 accent-primary"
              aria-label="Volume"
            />
          </div>
          <button
            type="button"
            onClick={cycleSpeed}
            className="rounded-sm px-1.5 py-0.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={`Playback speed ${playbackRate}x`}
          >
            {playbackRate}x
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="text-white hover:text-white/80"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
