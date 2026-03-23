import { usePlaybackStore } from '../store/playbackStore';

interface PlaybackControlsProps {
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  instrumentLoaded: boolean;
}

export function PlaybackControls({ onPlay, onPause, onSeek }: PlaybackControlsProps) {
  const status = usePlaybackStore((s) => s.status);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const duration = usePlaybackStore((s) => s.duration);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    onSeek(fraction * duration);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isPlaying = status === 'playing';
  const canPlay = status === 'ready' || status === 'paused';

  return (
    <div className="w-full max-w-5xl flex flex-col gap-3">
      {/* Progress bar */}
      <div
        className="w-full h-1.5 bg-surface-container-highest rounded-full cursor-pointer"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(181,196,255,0.4)] transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-label text-outline tabular-nums">
          {formatTime(currentTime)}
        </span>

        <div className="flex items-center gap-4">
          {/* Play/Pause button - pill-shaped primary gradient per DESIGN.md */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={!canPlay && !isPlaying}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary-container to-primary text-on-primary disabled:opacity-40 hover:scale-105 transition-transform shadow-lg"
          >
            {status === 'loading' ? (
              <span className="text-sm font-label">...</span>
            ) : isPlaying ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>
        </div>

        <span className="text-xs font-label text-outline tabular-nums">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
