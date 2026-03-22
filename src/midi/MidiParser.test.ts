import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseMidiFile } from './MidiParser';

// Helper: create a File-like object from the fixture
function loadFixture(filename: string): File {
  const buffer = readFileSync(resolve(__dirname, '../test/fixtures/' + filename));
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new File([arrayBuffer], filename, { type: 'audio/midi' });
}

describe('parseMidiFile', () => {
  it('parses test.mid and returns a SongModel', async () => {
    const file = loadFixture('test.mid');
    const song = await parseMidiFile(file);
    expect(song).toBeDefined();
    expect(song.name).toBeTruthy();
  });

  it('extracts correct number of notes', async () => {
    const file = loadFixture('test.mid');
    const song = await parseMidiFile(file);
    expect(song.notes.length).toBe(4);
  });

  it('extracts correct BPM', async () => {
    const file = loadFixture('test.mid');
    const song = await parseMidiFile(file);
    expect(song.bpm).toBe(120);
  });

  it('extracts correct time signature', async () => {
    const file = loadFixture('test.mid');
    const song = await parseMidiFile(file);
    expect(song.timeSignature).toEqual([4, 4]);
  });

  it('notes are sorted by startTime', async () => {
    const file = loadFixture('test.mid');
    const song = await parseMidiFile(file);
    for (let i = 1; i < song.notes.length; i++) {
      expect(song.notes[i].startTime).toBeGreaterThanOrEqual(song.notes[i - 1].startTime);
    }
  });

  it('first note is C4 (MIDI 60)', async () => {
    const file = loadFixture('test.mid');
    const song = await parseMidiFile(file);
    expect(song.notes[0].midi).toBe(60);
  });

  it('each note has required fields', async () => {
    const file = loadFixture('test.mid');
    const song = await parseMidiFile(file);
    for (const note of song.notes) {
      expect(note.midi).toBeTypeOf('number');
      expect(note.name).toBeTypeOf('string');
      expect(note.startTime).toBeTypeOf('number');
      expect(note.duration).toBeTypeOf('number');
      expect(note.velocity).toBeTypeOf('number');
      expect(note.track).toBeTypeOf('number');
    }
  });

  it('rejects invalid data with an error', async () => {
    const badFile = new File([new ArrayBuffer(10)], 'bad.mid');
    await expect(parseMidiFile(badFile)).rejects.toThrow();
  });
});
