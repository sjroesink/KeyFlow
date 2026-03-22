import { useCallback, useRef } from 'react';
import { parseMidiFile } from '../midi/MidiParser';
import { useSongStore } from '../store/songStore';

export function MidiImport() {
  const setSong = useSongStore(s => s.setSong);
  const setLoading = useSongStore(s => s.setLoading);
  const setError = useSongStore(s => s.setError);
  const isLoading = useSongStore(s => s.isLoading);
  const error = useSongStore(s => s.error);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.match(/\.(mid|midi)$/i)) {
      setError('Please select a .mid or .midi file');
      return;
    }

    setLoading(true);
    try {
      const song = await parseMidiFile(file);
      setSong(song);
    } catch (err) {
      setError(
        err instanceof Error
          ? 'Failed to parse MIDI file: ' + err.message
          : 'Failed to parse MIDI file'
      );
    }
  }, [setSong, setLoading, setError]);

  return (
    <div className="flex flex-col items-center gap-2">
      <label
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer font-medium transition-colors"
        htmlFor="midi-file-input"
      >
        {isLoading ? 'Loading...' : 'Import MIDI File'}
      </label>
      <input
        ref={inputRef}
        id="midi-file-input"
        type="file"
        accept=".mid,.midi"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
