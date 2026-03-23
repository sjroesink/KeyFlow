/**
 * FFT peak-picking chord detector.
 * Wraps an AnalyserNode with getFloatFrequencyData() to identify
 * multiple simultaneous notes via local-maxima peak detection
 * with harmonic overtone filtering.
 */
export class ChordDetector {
  private analyser: AnalyserNode;
  private freqBuffer: Float32Array;
  private binHz: number;

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.analyser.fftSize = 8192;
    this.freqBuffer = new Float32Array(analyser.frequencyBinCount);
    this.binHz = analyser.context.sampleRate / analyser.fftSize;
  }

  /**
   * Detect MIDI note numbers present in the current audio frame.
   * @param thresholdDb - minimum dB level for a peak to be considered (default -40)
   * @returns array of MIDI note numbers (21-108 range, sorted ascending)
   */
  detect(thresholdDb: number = -40): number[] {
    this.analyser.getFloatFrequencyData(
      this.freqBuffer as Float32Array<ArrayBuffer>,
    );

    // 1. Find local maxima above threshold
    const peakFreqs = this.findPeaks(thresholdDb);

    // 2. Filter harmonics (remove overtones of lower fundamentals)
    const fundamentals = this.filterHarmonics(peakFreqs);

    // 3. Map to MIDI, filter to piano range 21-108
    return fundamentals
      .map((f) => Math.round(12 * Math.log2(f / 440) + 69))
      .filter((m) => m >= 21 && m <= 108)
      .sort((a, b) => a - b);
  }

  /**
   * Find local maxima in frequency spectrum that are wider than 2 bins on each side.
   * Uses a lower threshold for bass frequencies (below 200 Hz) where fundamentals
   * are often weaker than their harmonics.
   */
  private findPeaks(thresholdDb: number): number[] {
    const peaks: number[] = [];
    const buf = this.freqBuffer;

    for (let i = 2; i < buf.length - 2; i++) {
      const val = buf[i];
      const freq = i * this.binHz;
      // Lower threshold for bass notes where fundamentals are weak
      const effectiveThreshold = freq < 200 ? thresholdDb - 15 : thresholdDb;
      if (
        val > effectiveThreshold &&
        val > buf[i - 1] &&
        val > buf[i - 2] &&
        val > buf[i + 1] &&
        val > buf[i + 2]
      ) {
        // Parabolic interpolation for sub-bin accuracy
        const interpFreq = this.interpolatePeak(i) * this.binHz;
        if (interpFreq >= 27.5 && interpFreq <= 4186) {
          peaks.push(interpFreq);
        }
      }
    }

    return peaks;
  }

  /**
   * Filter harmonics: if a frequency is a near-integer multiple (2x-8x)
   * of a lower frequency (within 5% tolerance), it's an overtone -- remove it.
   * Also checks for missing fundamentals: if a peak's sub-harmonic (half freq)
   * has significant energy in the spectrum, add the sub-harmonic as a fundamental.
   */
  private filterHarmonics(freqs: number[]): number[] {
    const sorted = [...freqs].sort((a, b) => a - b);

    // Sub-harmonic recovery: for each peak, check if half its frequency
    // has energy above noise floor — if so, the real fundamental was missed
    const recovered: number[] = [];
    for (const f of sorted) {
      const subFreq = f / 2;
      if (subFreq >= 27.5) {
        const subBin = Math.round(subFreq / this.binHz);
        if (subBin > 0 && subBin < this.freqBuffer.length) {
          const subEnergy = this.freqBuffer[subBin];
          // If sub-harmonic bin has meaningful energy (above -60 dB)
          // and isn't already in the peak list, add it
          if (subEnergy > -60 && !sorted.some((p) => Math.abs(p - subFreq) / subFreq < 0.03)) {
            recovered.push(subFreq);
          }
        }
      }
    }

    const allFreqs = [...recovered, ...sorted].sort((a, b) => a - b);
    const kept: number[] = [];

    for (const f of allFreqs) {
      const isHarmonic = kept.some((fundamental) => {
        const ratio = f / fundamental;
        const nearestInt = Math.round(ratio);
        return (
          nearestInt >= 2 &&
          nearestInt <= 8 &&
          Math.abs(ratio - nearestInt) < 0.05
        );
      });
      if (!isHarmonic) kept.push(f);
    }

    return kept;
  }

  /**
   * Parabolic interpolation around a peak bin for sub-bin frequency accuracy.
   */
  private interpolatePeak(bin: number): number {
    const y0 = this.freqBuffer[bin - 1];
    const y1 = this.freqBuffer[bin];
    const y2 = this.freqBuffer[bin + 1];
    const d = (y0 - y2) / (2 * (y0 - 2 * y1 + y2));
    return bin + d;
  }
}
