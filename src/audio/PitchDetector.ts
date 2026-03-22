import { PitchDetector as Pitchy } from 'pitchy';

export class PitchDetector {
  private detector: ReturnType<typeof Pitchy.forFloat32Array>;
  private buffer: Float32Array;
  private analyser: AnalyserNode;

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser;
    const bufferLength = analyser.fftSize;
    this.buffer = new Float32Array(bufferLength);
    this.detector = Pitchy.forFloat32Array(bufferLength);
  }

  /** Returns detected pitch or null if clarity too low or frequency out of range */
  detect(): { frequency: number; clarity: number } | null {
    this.analyser.getFloatTimeDomainData(this.buffer as Float32Array<ArrayBuffer>);

    const [frequency, clarity] = this.detector.findPitch(
      this.buffer,
      this.analyser.context.sampleRate,
    );

    // Clarity threshold: 0.9+ for confident single-note detection
    // Frequency range: A0 (27.5 Hz) to C8 (4186 Hz)
    if (clarity < 0.9 || frequency < 27.5 || frequency > 4186) {
      return null;
    }

    return { frequency, clarity };
  }
}
