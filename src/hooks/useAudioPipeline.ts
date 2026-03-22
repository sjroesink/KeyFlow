import { useRef, useCallback } from 'react';
import { AudioPipeline } from '../audio/AudioPipeline';
import { PitchDetector } from '../audio/PitchDetector';
import { useAudioStore } from '../store/audioStore';

export function useAudioPipeline() {
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const detectorRef = useRef<PitchDetector | null>(null);
  const rafRef = useRef<number>(0);
  const setDetectedNote = useAudioStore((s) => s.setDetectedNote);
  const setStatus = useAudioStore((s) => s.setStatus);

  const start = useCallback(async () => {
    try {
      setStatus('requesting');

      const pipeline = new AudioPipeline();
      await pipeline.start();
      pipelineRef.current = pipeline;
      detectorRef.current = new PitchDetector(pipeline.analyser!);

      setStatus('listening');

      // Detection loop via requestAnimationFrame
      const loop = () => {
        const result = detectorRef.current?.detect();
        if (result) {
          setDetectedNote(result.frequency, result.clarity);
        } else {
          setDetectedNote(null, 0);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setStatus('error', 'Microphone permission denied');
        } else if (err.name === 'NotFoundError') {
          setStatus('error', 'No microphone found');
        } else {
          setStatus('error', 'Microphone error: ' + err.message);
        }
      } else {
        setStatus(
          'error',
          'Microphone error: ' + (err instanceof Error ? err.message : String(err)),
        );
      }
    }
  }, [setDetectedNote, setStatus]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    pipelineRef.current?.stop();
    pipelineRef.current = null;
    detectorRef.current = null;
    setStatus('idle');
  }, [setStatus]);

  return { start, stop };
}
