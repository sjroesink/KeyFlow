import { useSongStore } from '../store/songStore';

export function SongInfo() {
  const song = useSongStore(s => s.song);

  if (!song) return null;

  const minutes = Math.floor(song.duration / 60);
  const seconds = Math.round(song.duration % 60);

  return (
    <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">{song.name}</h2>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="text-gray-400">BPM</span>
        <span>{Math.round(song.bpm)}</span>
        <span className="text-gray-400">Duration</span>
        <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
        <span className="text-gray-400">Time Signature</span>
        <span>{song.timeSignature[0]}/{song.timeSignature[1]}</span>
        <span className="text-gray-400">Notes</span>
        <span>{song.notes.length}</span>
        <span className="text-gray-400">Tracks</span>
        <span>{song.trackCount}</span>
      </div>
      {song.trackNames.filter(Boolean).length > 0 && (
        <div className="mt-4">
          <span className="text-gray-400 text-sm">Track names:</span>
          <ul className="text-sm mt-1">
            {song.trackNames.filter(Boolean).map((name, i) => (
              <li key={i} className="text-gray-300">- {name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
