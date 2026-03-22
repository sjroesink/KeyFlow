import { vi } from 'vitest';

export class MockAnalyserNode {
  fftSize = 2048;
  frequencyBinCount = 1024;
  context = { sampleRate: 44100 };

  getFloatTimeDomainData(buffer: Float32Array): void {
    // Fill with silence by default
    buffer.fill(0);
  }

  connect() { return this; }
  disconnect() {}
}

export class MockAudioContext {
  state: AudioContextState = 'running';
  sampleRate = 44100;

  private _analyser = new MockAnalyserNode();

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }

  createAnalyser(): MockAnalyserNode {
    return this._analyser;
  }

  createMediaStreamSource(_stream: MediaStream) {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
}

export class MockMediaStream {
  getTracks() {
    return [{ stop: vi.fn(), kind: 'audio' }];
  }
}

export function setupWebAudioMocks() {
  global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  global.navigator = {
    ...global.navigator,
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
    },
  } as unknown as Navigator;
}

export function teardownWebAudioMocks() {
  vi.restoreAllMocks();
}
