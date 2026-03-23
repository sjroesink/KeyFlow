import { PianoRoll } from './PianoRoll';
import { PianoKeyboard } from './PianoKeyboard';
import { PlaybackControls } from './PlaybackControls';
import { usePlaybackEngine } from '../hooks/usePlaybackEngine';
import { useSongStore } from '../store/songStore';

export function PracticeView() {
  const song = useSongStore((s) => s.song);
  const { canvasRefCallback, play, pause, seek, instrumentLoaded } = usePlaybackEngine();

  if (!song) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-16 bg-surface">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-bold tracking-tighter font-headline text-on-surface">Nocturne</span>
          <div className="flex flex-col">
            <h1 className="font-headline font-bold text-lg text-on-surface leading-tight">{song.name}</h1>
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
        <PianoRoll canvasRef={canvasRefCallback} />
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
