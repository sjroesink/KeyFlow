import { useEffect } from 'react';
import { MicrophoneSetup } from './components/MicrophoneSetup';
import { NoteDisplay } from './components/NoteDisplay';
import { MidiImport } from './components/MidiImport';
import { SongInfo } from './components/SongInfo';
import { PracticeView } from './components/PracticeView';
import { useSongStore } from './store/songStore';
import { parseMidiFile } from './midi/MidiParser';
import defaultMidi from './assets/mozart-piano-concerto-21-2-elvira-madigan-piano-solo.mid?url';

function App() {
  const song = useSongStore((s) => s.song);

  // Auto-load bundled MIDI file on first visit
  useEffect(() => {
    if (song) return;
    fetch(defaultMidi)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], 'Elvira Madigan.mid', { type: 'audio/midi' });
        return parseMidiFile(file);
      })
      .then((parsed) => {
        useSongStore.getState().setSong(parsed);
      })
      .catch(() => {
        // Fallback: let user import manually
      });
  }, [song]);

  if (song) {
    return <PracticeView />;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col items-center p-8 gap-8">
      <h1 className="text-3xl font-bold font-headline">WebPianoLearner</h1>

      <section className="flex flex-col items-center gap-6">
        <MicrophoneSetup />
        <NoteDisplay />
      </section>

      <section className="flex flex-col items-center gap-4">
        <h2 className="text-xl text-outline">Song Import</h2>
        <MidiImport />
        <SongInfo />
      </section>
    </div>
  );
}

export default App;
