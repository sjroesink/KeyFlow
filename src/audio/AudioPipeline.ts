export class AudioPipeline {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private _analyser: AnalyserNode | null = null;

  /** Returns the AnalyserNode after start(), null otherwise */
  get analyser(): AnalyserNode | null {
    return this._analyser;
  }

  /** Expose AudioContext for reuse by playback engine (shared context strategy) */
  get audioContext(): AudioContext | null {
    return this.ctx;
  }

  /** Create a fresh AudioContext for playback-only mode */
  static createAudioContext(): AudioContext {
    return new AudioContext();
  }

  /** Must be called from a click handler (user gesture requirement) */
  async start(): Promise<void> {
    // Create AudioContext on user gesture
    this.ctx = new AudioContext();

    // Safari may start suspended even on user gesture
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Request microphone with audio processing disabled for accurate pitch detection
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    // Connect mic -> analyser (no destination connection to avoid feedback)
    const source = this.ctx.createMediaStreamSource(this.stream);
    this._analyser = this.ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    source.connect(this._analyser);
    // Do NOT connect analyser to ctx.destination (would create feedback)
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.ctx = null;
    this.stream = null;
    this._analyser = null;
  }
}
