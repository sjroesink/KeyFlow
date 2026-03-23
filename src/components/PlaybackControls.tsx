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
    // Don't seek if we just finished a shift+drag
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

      // setLoopRegion validates minimum 1s duration
      usePracticeStore.getState().setLoopRegion({ start, end });
    },
    [duration],
  );

  const handleMouseMove = useCallback((_e: MouseEvent) => {
    // Could render a preview here in future; currently a no-op during drag
  }, []);

  // Attach window listeners for drag tracking
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
    <div className="w-full max-w-5xl flex flex-col gap-3">
      {/* Progress bar */}
      <div
        ref={progressBarRef}
        className="relative w-full h-1.5 bg-surface-container-highest rounded-full cursor-pointer"
        onClick={handleProgressClick}
        onMouseDown={handleMouseDown}
      >
        {/* Playback progress */}
        <div
          className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(181,196,255,0.4)] transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />

        {/* Loop region overlay */}
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

      {/* Hint text */}
      {!loopRegion && (
        <span className="text-[10px] text-outline/50 text-center -mt-1">
          Shift+drag to set loop
        </span>
      )}

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
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
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
