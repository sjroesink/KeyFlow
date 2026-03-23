import { MicrophoneSetup } from './components/MicrophoneSetup';
import { NoteDisplay } from './components/NoteDisplay';
import { MidiImport } from './components/MidiImport';
import { SongInfo } from './components/SongInfo';
import { PracticeView } from './components/PracticeView';
import { useSongStore } from './store/songStore';

function App() {
  const song = useSongStore((s) => s.song);

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
