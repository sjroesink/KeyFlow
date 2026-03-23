import { useEffect, useRef, useCallback } from 'react';
import { Note } from 'tonal';
import { PianoKeyboard } from './PianoKeyboard';
import { PlaybackControls } from './PlaybackControls';
import { PracticeControls } from './PracticeControls';
import { usePlaybackEngine } from '../hooks/usePlaybackEngine';
import { useAudioPipeline } from '../hooks/useAudioPipeline';
import { useSongStore } from '../store/songStore';
import { usePracticeStore } from '../store/practiceStore';
import { usePlaybackStore } from '../store/playbackStore';

const WHITE_KEY_COUNT = 52;
const WHITE_KEY_WIDTH = 44;
const KEYBOARD_WIDTH = WHITE_KEY_COUNT * WHITE_KEY_WIDTH;

export function PracticeView() {
  const song = useSongStore((s) => s.song);
  const { canvasRefCallback, play, pause, seek, instrumentLoaded, setPracticeEnabled, skipWait } =
    usePlaybackEngine();
  const { start: startMic, stop: stopMic } = useAudioPipeline();
  const scrollRef = useRef<HTMLDivElement>(null);
  const micStartedRef = useRef(false);

  const isWaiting = usePracticeStore((s) => s.isWaiting);
  const waitingForNotes = usePracticeStore((s) => s.waitingForNotes);
  const activeNotes = usePlaybackStore((s) => s.activeNotes);

  // Cleanup mic on unmount
  useEffect(() => {
    return () => {
      stopMic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start mic on first user interaction (avoids AudioContext autoplay block)
  const ensureMic = useCallback(() => {
    if (!micStartedRef.current) {
      micStartedRef.current = true;
      startMic();
    }
  }, [startMic]);

  // Auto-scroll to center on active/waiting notes
  useEffect(() => {
    if (!scrollRef.current) return;
    const notes = waitingForNotes.length > 0 ? waitingForNotes : activeNotes;
    if (notes.length === 0) return;

    const avgMidi = notes.reduce((a, b) => a + b, 0) / notes.length;
    const keyX = ((avgMidi - 21) / 88) * KEYBOARD_WIDTH;
    const containerWidth = scrollRef.current.clientWidth;
    const targetScroll = keyX - containerWidth / 2;
    scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }, [activeNotes, waitingForNotes]);

  const handlePlay = useCallback(() => {
    ensureMic();
    play();
  }, [ensureMic, play]);

  const handleToggleWaitMode = useCallback((enabled: boolean) => {
    ensureMic();
    usePracticeStore.getState().setMode(enabled ? 'waitMode' : 'off');
    setPracticeEnabled(enabled);
  }, [ensureMic, setPracticeEnabled]);

  const handleSkip = useCallback(() => {
    skipWait();
  }, [skipWait]);

  if (!song) return null;

  const noteNames = waitingForNotes.map((m) => Note.fromMidi(m));
  const waitLabel =
    noteNames.length > 1
      ? noteNames.join(' + ')
      : noteNames[0] ?? '';

  return (
    <div className="h-screen bg-background text-on-surface font-body flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex justify-between items-center px-6 h-14 bg-surface z-50">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold tracking-tighter font-headline text-on-surface">
            Nocturne
          </span>
          <div className="flex flex-col">
            <h1 className="font-headline font-bold text-base text-on-surface leading-tight">
              {song.name}
            </h1>
            <span className="text-[10px] font-label uppercase tracking-widest text-outline">
              {song.bpm} BPM &middot; {song.notes.length} notes
            </span>
          </div>
        </div>
        <PracticeControls
          onToggleWaitMode={handleToggleWaitMode}
          onSkip={handleSkip}
        />
      </header>

      {/* Scrollable piano roll + keyboard unit */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden flex flex-col">
        <div className="flex flex-col flex-1" style={{ width: `${KEYBOARD_WIDTH}px`, minWidth: '100%' }}>
          {/* Canvas — falling notes */}
          <div className="flex-1 relative" style={{ minWidth: `${KEYBOARD_WIDTH}px` }}>
            <canvas
              ref={canvasRefCallback}
              className="absolute inset-0 w-full h-full"
            />
            {/* Waiting notification */}
            {isWaiting && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-surface-variant/60 backdrop-blur-xl px-6 py-3 rounded-full border border-outline-variant/15 flex items-center gap-3">
                <svg className="w-5 h-5 text-secondary animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                </svg>
                <span className="text-sm font-medium tracking-wide text-on-surface-variant">
                  Waiting for{' '}
                  <span className="text-secondary font-bold">{waitLabel}</span>
                </span>
              </div>
            )}
          </div>

          {/* Keyboard */}
          <div className="shrink-0 bg-surface-container-low" style={{ minWidth: `${KEYBOARD_WIDTH}px` }}>
            <PianoKeyboard />
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div className="shrink-0 px-6 py-1 bg-surface z-40">
        <PlaybackControls
          onPlay={handlePlay}
          onPause={pause}
          onSeek={seek}
          instrumentLoaded={instrumentLoaded}
        />
      </div>
    </div>
  );
}
