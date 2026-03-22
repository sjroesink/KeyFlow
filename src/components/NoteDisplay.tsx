import { useAudioStore } from '../store/audioStore';

export function NoteDisplay() {
  const detectedPitch = useAudioStore((s) => s.detectedPitch);

  return (
    <div className="flex flex-col items-center gap-2">
      {detectedPitch ? (
        <>
          <span className="text-6xl font-bold text-white">
            {detectedPitch.noteName}
          </span>
          <span className="text-lg text-gray-400">
            {detectedPitch.frequency.toFixed(1)} Hz
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(detectedPitch.clarity * 100)}%
          </span>
        </>
      ) : (
        <>
          <span className="text-6xl font-bold text-gray-600">---</span>
          <span className="text-lg text-gray-500">Play a note...</span>
        </>
      )}
    </div>
  );
}
