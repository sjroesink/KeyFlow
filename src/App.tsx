import { MicrophoneSetup } from './components/MicrophoneSetup'
import { NoteDisplay } from './components/NoteDisplay'
import { MidiImport } from './components/MidiImport'
import { SongInfo } from './components/SongInfo'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-8 gap-8">
      <h1 className="text-3xl font-bold">WebPianoLearner</h1>

      <section className="flex flex-col items-center gap-6">
        <MicrophoneSetup />
        <NoteDisplay />
      </section>

      <section className="flex flex-col items-center gap-4">
        <h2 className="text-xl text-gray-400">Song Import</h2>
        <MidiImport />
        <SongInfo />
      </section>
    </div>
  )
}
export default App
