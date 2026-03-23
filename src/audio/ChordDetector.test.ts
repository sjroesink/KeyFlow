import { describe, it, expect } from 'vitest';
import { ChordDetector } from './ChordDetector';

const SAMPLE_RATE = 44100;
const FFT_SIZE = 8192;
const BIN_COUNT = FFT_SIZE / 2;
const BIN_HZ = SAMPLE_RATE / FFT_SIZE;

function createMockAnalyser(peakSetup?: (buffer: Float32Array) => void) {
  const buffer = new Float32Array(BIN_COUNT);
  // Fill with silence (-100dB)
  buffer.fill(-100);

  if (peakSetup) {
    peakSetup(buffer);
  }

  return {
    fftSize: FFT_SIZE,
    frequencyBinCount: BIN_COUNT,
    smoothingTimeConstant: 0.8,
    context: { sampleRate: SAMPLE_RATE },
    getFloatFrequencyData: (dest: Float32Array) => {
      dest.set(buffer);
    },
  } as unknown as AnalyserNode;
}

/** Create a peak shape at a given frequency (bell curve over ~5 bins) */
function addPeak(buffer: Float32Array, freqHz: number, peakDb: number = -20) {
  const bin = Math.round(freqHz / BIN_HZ);
  if (bin >= 3 && bin < buffer.length - 3) {
    buffer[bin] = peakDb;
    buffer[bin - 1] = peakDb - 6;
    buffer[bin + 1] = peakDb - 6;
    buffer[bin - 2] = peakDb - 15;
    buffer[bin + 2] = peakDb - 15;
  }
}

describe('ChordDetector', () => {
  it('returns empty array for silence (all bins below threshold)', () => {
    const analyser = createMockAnalyser();
    const detector = new ChordDetector(analyser);
    const result = detector.detect();
    expect(result).toEqual([]);
  });

  it('detects a single peak at 440Hz as MIDI 69 (A4)', () => {
    const analyser = createMockAnalyser((buf) => {
      addPeak(buf, 440);
    });
    const detector = new ChordDetector(analyser);
    const result = detector.detect();
    expect(result).toContain(69);
  });

  it('filters harmonics -- peaks at 440Hz and 880Hz returns only MIDI 69', () => {
    const analyser = createMockAnalyser((buf) => {
      addPeak(buf, 440, -20);
      addPeak(buf, 880, -25);
    });
    const detector = new ChordDetector(analyser);
    const result = detector.detect();
    expect(result).toContain(69);
    expect(result).not.toContain(81); // 880Hz = A5 = MIDI 81
  });

  it('detects two non-harmonic peaks (A4 and C5)', () => {
    const analyser = createMockAnalyser((buf) => {
      addPeak(buf, 440, -20);   // A4 = MIDI 69
      addPeak(buf, 523.25, -20); // C5 = MIDI 72
    });
    const detector = new ChordDetector(analyser);
    const result = detector.detect();
    expect(result).toContain(69);
    expect(result).toContain(72);
  });
});
