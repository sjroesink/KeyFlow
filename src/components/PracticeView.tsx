import { useEffect } from 'react';
import { Note } from 'tonal';
import { PianoRoll } from './PianoRoll';
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

  const noteNames = waitingForNotes.map((m) => Note.fromMidi(m)).join(', ');

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

      {/* Main area */}
      <main className="flex-1 mt-16 flex flex-col items-center justify-center relative px-6 pb-64 gap-4">
        {/* PianoRoll with waiting notification overlay */}
        <div className="relative w-full max-w-5xl">
          <PianoRoll canvasRef={canvasRefCallback} />

          {/* Waiting notification */}
          {isWaiting && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-surface-variant/60 backdrop-blur-xl px-6 py-3 rounded-full border border-outline-variant/15 flex items-center gap-3">
              {/* Pulsing pause icon */}
              <svg
                className="w-5 h-5 text-secondary animate-pulse"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
              <span className="text-sm font-medium tracking-wide text-on-surface-variant">
                Waiting for{' '}
                <span className="text-secondary font-bold">{noteNames}</span>
              </span>
            </div>
          )}
        </div>

        {/* Practice controls - floating between piano roll and playback */}
        <div className="flex items-center justify-center">
          <PracticeControls
            onToggleWaitMode={handleToggleWaitMode}
            onSkip={handleSkip}
          />
        </div>

        <PlaybackControls
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          instrumentLoaded={instrumentLoaded}
        />
      </main>

      {/* Footer with keyboard */}
      <footer className="fixed bottom-0 w-full z-40">
        <div className="bg-surface-container-low px-8 py-4 flex items-end justify-center overflow-x-auto">
          <PianoKeyboard />
        </div>
      </footer>
    </div>
  );
}
