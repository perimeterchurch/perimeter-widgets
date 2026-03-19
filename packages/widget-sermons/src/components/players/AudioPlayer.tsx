import { useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useMediaPlayer } from '../../hooks/use-media-player';

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function AudioPlayer({ url }: { url: string }) {
    const {
        mediaRef, isPlaying, currentTime, duration, volume, playbackRate,
        togglePlay, seekTo, setVolume, setPlaybackRate,
    } = useMediaPlayer();

    const cycleSpeed = useCallback(() => {
        const currentIndex = SPEEDS.indexOf(playbackRate as (typeof SPEEDS)[number]);
        const nextIndex = (currentIndex + 1) % SPEEDS.length;
        setPlaybackRate(SPEEDS[nextIndex]!);
    }, [playbackRate, setPlaybackRate]);

    return (
        <div className="flex h-full w-full items-center justify-center p-4">
            <div className="flex w-full max-w-[500px] items-center gap-3 rounded-xl bg-stone-100 px-5 py-3 shadow-lg dark:bg-stone-800">
                <button type="button" onClick={togglePlay} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90" aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <input type="range" min={0} max={duration || 0} step={0.1} value={currentTime} onChange={(e) => seekTo(parseFloat(e.target.value))} className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-stone-300 accent-primary dark:bg-stone-600" aria-label="Seek" />
                <span className="whitespace-nowrap text-xs text-stone-500 dark:text-stone-400">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200" aria-label={volume === 0 ? 'Unmute' : 'Mute'}>
                        {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-stone-300 accent-primary dark:bg-stone-600" aria-label="Volume" />
                </div>
                <button type="button" onClick={cycleSpeed} className="rounded px-1.5 py-0.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200" aria-label={`Playback speed ${playbackRate}x`}>{playbackRate}x</button>
            </div>
            <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={url} preload="metadata" />
        </div>
    );
}
