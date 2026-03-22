import { Midi } from '@tonejs/midi';
import type { SongModel, SongNote } from '../types/song';

export async function parseMidiFile(file: File): Promise<SongModel> {
  const arrayBuffer = await file.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  const notes: SongNote[] = [];
  midi.tracks.forEach((track, trackIndex) => {
    // Skip percussion tracks (channel 9/10 in General MIDI)
    if (track.instrument.percussion) return;

    track.notes.forEach(note => {
      notes.push({
        midi: note.midi,
        name: note.name,
        startTime: note.time,
        duration: note.duration,
        velocity: note.velocity,
        track: trackIndex,
      });
    });
  });

  // Sort by start time for efficient runtime queries
  notes.sort((a, b) => a.startTime - b.startTime);

  return {
    name: midi.header.name || file.name.replace(/\.(mid|midi)$/i, ''),
    duration: midi.duration,
    bpm: midi.header.tempos[0]?.bpm ?? 120,
    timeSignature: midi.header.timeSignatures[0]
      ? [
          midi.header.timeSignatures[0].timeSignature[0],
          midi.header.timeSignatures[0].timeSignature[1],
        ]
      : [4, 4],
    notes,
    trackCount: midi.tracks.length,
    trackNames: midi.tracks.map(t => t.name),
  };
}
