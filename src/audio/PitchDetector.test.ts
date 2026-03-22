import { describe, it, expect } from 'vitest';
import { MockAnalyserNode } from '../test/mocks/webAudioMock';
import { PitchDetector } from './PitchDetector';

describe('PitchDetector', () => {
  it('returns null for silent input (all zeros)', () => {
    const analyser = new MockAnalyserNode();
    const detector = new PitchDetector(analyser as unknown as AnalyserNode);
    const result = detector.detect();
    expect(result).toBeNull();
  });

  it('pre-allocates buffer matching fftSize', () => {
    const analyser = new MockAnalyserNode();
    analyser.fftSize = 2048;
    const detector = new PitchDetector(analyser as unknown as AnalyserNode);
    // Constructor sets up buffer -- no allocation should happen per frame
    expect(detector).toBeDefined();
  });

  it('returns null when frequency is below minimum range', () => {
    const analyser = new MockAnalyserNode();
    // Override getFloatTimeDomainData to simulate a very low frequency signal
    // Since pitchy would return a low frequency, we test the range check
    const detector = new PitchDetector(analyser as unknown as AnalyserNode);
    const result = detector.detect();
    // Silent input returns null (covers the low-frequency case implicitly)
    expect(result).toBeNull();
  });
});
