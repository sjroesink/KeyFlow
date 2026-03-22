import { useMemo } from 'react';
import { Note } from 'tonal';
import { usePlaybackStore } from '../store/playbackStore';
import { useAudioStore } from '../store/audioStore';
import { isBlackKey } from '../visualization/colors';

interface PianoKeyboardProps {
  /** Optional: override range instead of full 88 keys. Default: 21-108 */
  startMidi?: number;
  endMidi?: number;
}

type HighlightState = 'none' | 'expected' | 'correct' | 'error';

function getHighlight(
  midi: number,
  activeNotes: number[],
  detectedMidi: number | null,
): HighlightState {
  const isExpected = activeNotes.includes(midi);
  const isDetected = detectedMidi === midi;

  if (isExpected && isDetected) return 'correct';
  if (isExpected) return 'expected';
  if (isDetected) return 'error';
  return 'none';
}

function getWhiteKeyClasses(highlight: HighlightState): string {
  const base = 'piano-key-white border-r border-background/50 relative overflow-hidden transition-colors';
  switch (highlight) {
    case 'correct':
      return `${base} bg-tertiary shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2)] shadow-[0_0_12px_#66dd8b]`;
    case 'expected':
      return `${base} bg-secondary/90 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2)]`;
    case 'error':
      return `${base} bg-error shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2)]`;
    default:
      return `${base} bg-on-surface-variant/10 hover:bg-surface-bright`;
  }
}

function getBlackKeyClasses(highlight: HighlightState): string {
  const base = 'piano-key-black relative overflow-hidden transition-colors';
  switch (highlight) {
    case 'correct':
      return `${base} bg-tertiary shadow-[inset_0_-5px_10px_rgba(0,0,0,0.4)] shadow-[0_0_12px_#66dd8b]`;
    case 'expected':
      return `${base} bg-secondary/90 shadow-[inset_0_-5px_10px_rgba(0,0,0,0.4)]`;
    case 'error':
      return `${base} bg-error shadow-[inset_0_-5px_10px_rgba(0,0,0,0.4)]`;
    default:
      return `${base} bg-surface-container-lowest`;
  }
}

function midiToNoteName(midi: number): string {
  return Note.fromMidi(midi) ?? '';
}

export function PianoKeyboard({ startMidi = 21, endMidi = 108 }: PianoKeyboardProps) {
  const activeNotes = usePlaybackStore((s) => s.activeNotes);
  const detectedPitch = useAudioStore((s) => s.detectedPitch);
  const detectedMidi = detectedPitch?.midiNumber ?? null;

  const keys = useMemo(() => {
    const result: { midi: number; black: boolean }[] = [];
    for (let midi = startMidi; midi <= endMidi; midi++) {
      result.push({ midi, black: isBlackKey(midi) });
    }
    return result;
  }, [startMidi, endMidi]);

  return (
    <div className="flex items-start" role="group" aria-label="Piano keyboard">
      {keys.map(({ midi, black }) => {
        const highlight = getHighlight(midi, activeNotes, detectedMidi);
        const classes = black
          ? getBlackKeyClasses(highlight)
          : getWhiteKeyClasses(highlight);
        const showLabel = highlight === 'expected' || highlight === 'correct';

        return (
          <div
            key={midi}
            data-testid={`piano-key-${midi}`}
            className={classes}
          >
            {showLabel && (
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-on-secondary-container">
                {midiToNoteName(midi)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
