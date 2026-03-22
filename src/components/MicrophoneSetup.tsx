import { useAudioPipeline } from '../hooks/useAudioPipeline';
import { useAudioStore } from '../store/audioStore';

export function MicrophoneSetup() {
  const { start, stop } = useAudioPipeline();
  const status = useAudioStore((s) => s.status);
  const error = useAudioStore((s) => s.error);
  const isListening = useAudioStore((s) => s.isListening);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        {status === 'requesting' ? (
          <button
            disabled
            className="px-6 py-3 rounded-lg bg-gray-600 text-gray-300 cursor-not-allowed"
          >
            Requesting...
          </button>
        ) : isListening ? (
          <button
            onClick={stop}
            className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
          >
            Stop Listening
          </button>
        ) : (
          <button
            onClick={start}
            className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
          >
            Start Listening
          </button>
        )}

        {isListening && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
