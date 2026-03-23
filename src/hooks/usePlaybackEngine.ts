import { useRef, useEffect, useCallback, useState } from 'react';
import { SplendidGrandPiano } from 'smplr';
import { PlaybackEngine } from '../engine/PlaybackEngine';
import { PianoRollRenderer } from '../visualization/PianoRollRenderer';
import { AudioPipeline } from '../audio/AudioPipeline';
import { useSongStore } from '../store/songStore';
import { usePlaybackStore } from '../store/playbackStore';

export function usePlaybackEngine() {
  const engineRef = useRef<PlaybackEngine | null>(null);
  const [instrumentLoaded, setInstrumentLoaded] = useState(false);
  const song = useSongStore((s) => s.song);

  // Initialize engine on mount
  useEffect(() => {
    const audioContext = AudioPipeline.createAudioContext();
    const piano = new SplendidGrandPiano(audioContext);

    const engine = new PlaybackEngine(audioContext, piano);
    engineRef.current = engine;

    // Load samples
    usePlaybackStore.getState().setStatus('loading');
    piano.load.then(() => {
      setInstrumentLoaded(true);
      if (useSongStore.getState().song) {
        usePlaybackStore.getState().setStatus('ready');
      }
    });

    return () => {
      engine.dispose();
      piano.stop();
      audioContext.close();
    };
  }, []);

  // When song changes, load into engine
  useEffect(() => {
    if (song && engineRef.current) {
      engineRef.current.setSong(song);
      if (instrumentLoaded) {
        usePlaybackStore.getState().setStatus('ready');
      }
    }
  }, [song, instrumentLoaded]);

  // Canvas ref callback - creates renderer and attaches to engine
  const canvasRefCallback = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !engineRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle DPI scaling
    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    updateSize();

    const renderer = new PianoRollRenderer(ctx);
    engineRef.current.setRenderer(renderer);
  }, []);

  const play = useCallback(() => engineRef.current?.play(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const seek = useCallback((t: number) => engineRef.current?.seek(t), []);
  const stop = useCallback(() => engineRef.current?.stop(), []);

  return { canvasRefCallback, play, pause, seek, stop, instrumentLoaded };
}
