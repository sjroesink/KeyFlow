import { useRef, useCallback } from 'react';
import { AudioPipeline } from '../audio/AudioPipeline';
import { PitchDetector } from '../audio/PitchDetector';
import { ChordDetector } from '../audio/ChordDetector';
import { useAudioStore } from '../store/audioStore';
import { usePracticeStore } from '../store/practiceStore';

export function useAudioPipeline() {
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const detectorRef = useRef<PitchDetector | null>(null);
  const chordDetectorRef = useRef<ChordDetector | null>(null);
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
      chordDetectorRef.current = new ChordDetector(pipeline.analyser!);

      setStatus('listening');

      // Detection loop via requestAnimationFrame
      const loop = () => {
        const result = detectorRef.current?.detect();
        if (result) {
          setDetectedNote(result.frequency, result.clarity);
        } else {
          setDetectedNote(null, 0);
        }

        // Run chord detection when practice mode is active
        const practiceMode = usePracticeStore.getState().mode;
        if (practiceMode !== 'off' && chordDetectorRef.current) {
          const chordMidis = chordDetectorRef.current.detect();
          usePracticeStore.getState().setDetectedChord(chordMidis);
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
    chordDetectorRef.current = null;
    setStatus('idle');
  }, [setStatus]);

  const getAudioContext = useCallback(
    () => pipelineRef.current?.audioContext ?? null,
    [],
  );

  return { start, stop, getAudioContext };
}
