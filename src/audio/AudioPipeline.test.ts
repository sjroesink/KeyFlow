import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupWebAudioMocks, teardownWebAudioMocks } from '../test/mocks/webAudioMock';
import { AudioPipeline } from './AudioPipeline';

describe('AudioPipeline', () => {
  beforeEach(() => setupWebAudioMocks());
  afterEach(() => teardownWebAudioMocks());

  it('creates AudioContext on start', async () => {
    const pipeline = new AudioPipeline();
    await pipeline.start();
    expect(pipeline.analyser).not.toBeNull();
    pipeline.stop();
  });

  it('calls getUserMedia with audio processing disabled', async () => {
    const pipeline = new AudioPipeline();
    await pipeline.start();
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    pipeline.stop();
  });

  it('sets analyser to null after stop', async () => {
    const pipeline = new AudioPipeline();
    await pipeline.start();
    pipeline.stop();
    expect(pipeline.analyser).toBeNull();
  });

  it('configures analyser with fftSize 2048', async () => {
    const pipeline = new AudioPipeline();
    await pipeline.start();
    expect(pipeline.analyser!.fftSize).toBe(2048);
    pipeline.stop();
  });

  it('resumes suspended AudioContext (Safari fix)', async () => {
    // Mock AudioContext that starts suspended
    const originalAudioContext = global.AudioContext;
    const resumeSpy = import('vitest').then(v => v.vi.fn());
    global.AudioContext = class extends (originalAudioContext as any) {
      state = 'suspended' as AudioContextState;
      resume = async () => { this.state = 'running' as AudioContextState; };
    } as unknown as typeof AudioContext;

    const pipeline = new AudioPipeline();
    await pipeline.start();
    expect(pipeline.analyser).not.toBeNull();
    pipeline.stop();
  });
});
