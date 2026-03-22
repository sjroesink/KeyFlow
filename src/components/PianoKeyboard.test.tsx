import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PianoKeyboard } from './PianoKeyboard';
import { usePlaybackStore } from '../store/playbackStore';
import { useAudioStore } from '../store/audioStore';

// Reset stores before each test
beforeEach(() => {
  usePlaybackStore.setState({
    status: 'idle',
    currentTime: 0,
    duration: 0,
    activeNotes: [],
  });
  useAudioStore.setState({
    status: 'idle',
    error: null,
    detectedPitch: null,
    isListening: false,
  });
});

describe('PianoKeyboard', () => {
  it('renders correct number of white keys (52) and black keys (36) for full 88-key range', () => {
    render(<PianoKeyboard />);
    const whiteKeys = document.querySelectorAll('.piano-key-white');
    const blackKeys = document.querySelectorAll('.piano-key-black');
    expect(whiteKeys).toHaveLength(52);
    expect(blackKeys).toHaveLength(36);
  });

  it('white key with no highlight has bg-on-surface-variant/10 class', () => {
    render(<PianoKeyboard />);
    // C4 (MIDI 60) is a white key with no highlight by default
    const c4Key = screen.getByTestId('piano-key-60');
    expect(c4Key.className).toContain('bg-on-surface-variant/10');
  });

  it('black key with no highlight has bg-surface-container-lowest class', () => {
    render(<PianoKeyboard />);
    // C#4 (MIDI 61) is a black key
    const cs4Key = screen.getByTestId('piano-key-61');
    expect(cs4Key.className).toContain('bg-surface-container-lowest');
  });

  it('expected (active) note applies bg-secondary class', () => {
    usePlaybackStore.setState({ activeNotes: [60] }); // C4 is expected
    render(<PianoKeyboard />);
    const c4Key = screen.getByTestId('piano-key-60');
    expect(c4Key.className).toContain('bg-secondary');
  });

  it('correct note (expected AND detected) applies bg-tertiary class', () => {
    usePlaybackStore.setState({ activeNotes: [60] });
    useAudioStore.setState({
      detectedPitch: {
        frequency: 261.63,
        clarity: 0.95,
        noteName: 'C4',
        midiNumber: 60,
      },
    });
    render(<PianoKeyboard />);
    const c4Key = screen.getByTestId('piano-key-60');
    expect(c4Key.className).toContain('bg-tertiary');
  });

  it('detected-but-not-expected note applies bg-error class', () => {
    usePlaybackStore.setState({ activeNotes: [62] }); // D4 expected
    useAudioStore.setState({
      detectedPitch: {
        frequency: 261.63,
        clarity: 0.95,
        noteName: 'C4',
        midiNumber: 60, // C4 detected but not expected
      },
    });
    render(<PianoKeyboard />);
    const c4Key = screen.getByTestId('piano-key-60');
    expect(c4Key.className).toContain('bg-error');
  });

  it('reads activeNotes from playbackStore and detectedPitch from audioStore', () => {
    usePlaybackStore.setState({ activeNotes: [64, 67] }); // E4, G4
    useAudioStore.setState({
      detectedPitch: {
        frequency: 329.63,
        clarity: 0.95,
        noteName: 'E4',
        midiNumber: 64,
      },
    });
    render(<PianoKeyboard />);
    // E4 is both expected and detected -> tertiary (correct)
    const e4Key = screen.getByTestId('piano-key-64');
    expect(e4Key.className).toContain('bg-tertiary');
    // G4 is expected but not detected -> secondary (waiting)
    const g4Key = screen.getByTestId('piano-key-67');
    expect(g4Key.className).toContain('bg-secondary');
  });
});
