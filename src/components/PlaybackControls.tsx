import { useRef, useEffect, useCallback } from 'react';
import { usePlaybackStore } from '../store/playbackStore';
import { usePracticeStore } from '../store/practiceStore';

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
  const loopRegion = usePracticeStore((s) => s.loopRegion);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const progressBarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dragging: boolean; startFraction: number }>({
    dragging: false,
    startFraction: 0,
  });

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    onSeek(fraction * duration);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    dragRef.current = { dragging: true, startFraction: fraction };
  };

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const bar = progressBarRef.current;
      if (!bar) return;

      const rect = bar.getBoundingClientRect();
      const endFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const startFrac = dragRef.current.startFraction;

      const start = Math.min(startFrac, endFraction) * duration;
      const end = Math.max(startFrac, endFraction) * duration;

      dragRef.current.dragging = false;
      usePracticeStore.getState().setLoopRegion({ start, end });
    },
    [duration],
  );

  const handleMouseMove = useCallback((_e: MouseEvent) => {}, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isPlaying = status === 'playing';
  const canPlay = status === 'ready' || status === 'paused';

  return (
    <div className="w-full flex items-center gap-3">
      {/* Time */}
      <span className="text-[10px] font-label text-outline tabular-nums shrink-0">
        {formatTime(currentTime)}
      </span>

      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={!canPlay && !isPlaying}
        className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-primary-container to-primary text-on-primary disabled:opacity-40 hover:scale-105 transition-transform shadow-lg"
      >
        {status === 'loading' ? (
          <span className="text-[10px] font-label">...</span>
        ) : isPlaying ? (
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* Progress bar — fills remaining space */}
      <div
        ref={progressBarRef}
        className="relative flex-1 h-1.5 bg-surface-container-highest rounded-full cursor-pointer"
        onClick={handleProgressClick}
        onMouseDown={handleMouseDown}
      >
        <div
          className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(181,196,255,0.3)] transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
        {loopRegion && duration > 0 && (
          <div
            className="absolute top-0 h-full bg-primary/20 border-l-2 border-r-2 border-primary/50 pointer-events-none rounded-full"
            style={{
              left: `${(loopRegion.start / duration) * 100}%`,
              width: `${((loopRegion.end - loopRegion.start) / duration) * 100}%`,
            }}
          />
        )}
      </div>

      {/* Duration */}
      <span className="text-[10px] font-label text-outline tabular-nums shrink-0">
        {formatTime(duration)}
      </span>
    </div>
  );
}
