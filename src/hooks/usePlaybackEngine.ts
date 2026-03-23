import { useRef, useEffect, useCallback, useState } from 'react';
import { SplendidGrandPiano } from 'smplr';
import { PlaybackEngine } from '../engine/PlaybackEngine';
import { PianoRollRenderer } from '../visualization/PianoRollRenderer';
import { AudioPipeline } from '../audio/AudioPipeline';
import { useSongStore } from '../store/songStore';
import { usePlaybackStore } from '../store/playbackStore';

export function usePlaybackEngine(externalAudioContext?: AudioContext) {
  const engineRef = useRef<PlaybackEngine | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [instrumentLoaded, setInstrumentLoaded] = useState(false);
  const song = useSongStore((s) => s.song);

  // Attach renderer when both engine and canvas are available
  const attachRenderer = useCallback(() => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle DPI scaling
    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Clean up previous observer
    observerRef.current?.disconnect();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    observerRef.current = observer;
    updateSize();

    const renderer = new PianoRollRenderer(ctx);
    engine.setRenderer(renderer);
  }, []);

  // Initialize engine on mount
  useEffect(() => {
    const audioContext = externalAudioContext ?? AudioPipeline.createAudioContext();
    const ownedContext = !externalAudioContext;
    audioContextRef.current = audioContext;

    const piano = new SplendidGrandPiano(audioContext);
    const engine = new PlaybackEngine(audioContext, piano);
    engineRef.current = engine;

    // Try attaching renderer (canvas might already be mounted)
    attachRenderer();

    // Load samples
    usePlaybackStore.getState().setStatus('loading');
    piano.load.then(() => {
      setInstrumentLoaded(true);
      if (useSongStore.getState().song) {
        usePlaybackStore.getState().setStatus('ready');
      }
    });

    return () => {
      observerRef.current?.disconnect();
      engine.dispose();
      piano.stop();
      if (ownedContext) audioContext.close();
    };
  }, [externalAudioContext, attachRenderer]);

  // When song changes, load into engine
  useEffect(() => {
    if (song && engineRef.current) {
      engineRef.current.setSong(song);
      if (instrumentLoaded) {
        usePlaybackStore.getState().setStatus('ready');
      }
    }
  }, [song, instrumentLoaded]);

  // Canvas ref callback
  const canvasRefCallback = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
    if (canvas) attachRenderer();
  }, [attachRenderer]);

  const play = useCallback(() => engineRef.current?.play(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
  const seek = useCallback((t: number) => engineRef.current?.seek(t), []);
  const stop = useCallback(() => engineRef.current?.stop(), []);

  const setPracticeEnabled = useCallback((enabled: boolean) => {
    engineRef.current?.setPracticeEnabled(enabled);
  }, []);

  const skipWait = useCallback(() => {
    engineRef.current?.skipWait();
  }, []);

  return {
    canvasRefCallback,
    play,
    pause,
    seek,
    stop,
    instrumentLoaded,
    setPracticeEnabled,
    skipWait,
    audioContext: audioContextRef.current,
  };
}
