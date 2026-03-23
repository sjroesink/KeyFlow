import { useEffect } from 'react';
import { Note } from 'tonal';
import { PianoKeyboard } from './PianoKeyboard';
import { PlaybackControls } from './PlaybackControls';
import { PracticeControls } from './PracticeControls';
import { usePlaybackEngine } from '../hooks/usePlaybackEngine';
import { useAudioPipeline } from '../hooks/useAudioPipeline';
import { useSongStore } from '../store/songStore';
import { usePracticeStore } from '../store/practiceStore';

export function PracticeView() {
  const song = useSongStore((s) => s.song);
  const { canvasRefCallback, play, pause, seek, instrumentLoaded, setPracticeEnabled } =
    usePlaybackEngine();
  const { start: startMic, stop: stopMic } = useAudioPipeline();

  const isWaiting = usePracticeStore((s) => s.isWaiting);
  const waitingForNotes = usePracticeStore((s) => s.waitingForNotes);

  // Auto-start microphone on mount
  useEffect(() => {
    startMic();
    return () => {
      stopMic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleWaitMode = (enabled: boolean) => {
    usePracticeStore.getState().setMode(enabled ? 'waitMode' : 'off');
    setPracticeEnabled(enabled);
  };

  const handleSkip = () => {
    usePracticeStore.getState().setIsWaiting(false);
    play();
  };

  if (!song) return null;

  const noteNames = waitingForNotes.map((m) => Note.fromMidi(m));
  const waitLabel =
    noteNames.length > 1
      ? noteNames.join(' + ')
      : noteNames[0] ?? '';

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-16 bg-surface">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-bold tracking-tighter font-headline text-on-surface">
            Nocturne
          </span>
          <div className="flex flex-col">
            <h1 className="font-headline font-bold text-lg text-on-surface leading-tight">
              {song.name}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-label uppercase tracking-widest text-outline">
                {song.bpm} BPM &middot; {song.notes.length} notes
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Floating controls overlay - top center */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4">
        <PracticeControls
          onToggleWaitMode={handleToggleWaitMode}
          onSkip={handleSkip}
        />
      </div>

      {/* Waiting notification overlay */}
      {isWaiting && (
        <div className="fixed top-36 left-1/2 -translate-x-1/2 z-40 bg-surface-variant/60 backdrop-blur-xl px-6 py-3 rounded-full border border-outline-variant/15 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-secondary animate-pulse"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
          <span className="text-sm font-medium tracking-wide text-on-surface-variant">
            Waiting for{' '}
            <span className="text-secondary font-bold">{waitLabel}</span>
          </span>
        </div>
      )}

      {/* Main content: piano roll + keyboard stacked, anchored to bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center">
        {/* Playback controls bar */}
        <div className="w-full px-8 py-2 flex items-center justify-center">
          <PlaybackControls
            onPlay={play}
            onPause={pause}
            onSeek={seek}
            instrumentLoaded={instrumentLoaded}
          />
        </div>

        {/* Piano roll canvas — directly above keyboard, same width */}
        <div className="w-full overflow-x-auto">
          <div className="inline-flex flex-col items-start min-w-full justify-center px-8">
            {/* Canvas fills the space above the keyboard */}
            <div className="relative" style={{ width: 'calc(88 * 44px)' }}>
              <div className="h-[50vh] bg-surface-container-low overflow-hidden">
                <canvas
                  ref={canvasRefCallback}
                  className="w-full h-full"
                />
              </div>
              {/* Keyboard directly below — notes fall onto the keys */}
              <PianoKeyboard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
