import { NOTE_NAMES_SHARP, NOTE_NAMES_FLAT, NOTE_TO_INDEX } from './constants.js';
import type { CustomChordDiagram } from '../types/index.js';

// Intervals (in semitones) for common chord qualities
const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],             // major
  'm': [0, 3, 7],            // minor
  'min': [0, 3, 7],
  '7': [0, 4, 7, 10],        // dominant 7
  'maj7': [0, 4, 7, 11],     // major 7
  'm7': [0, 3, 7, 10],       // minor 7
  'min7': [0, 3, 7, 10],
  'dim': [0, 3, 6],          // diminished
  'dim7': [0, 3, 6, 9],
  'aug': [0, 4, 8],          // augmented
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'sus': [0, 5, 7],
  'add9': [0, 4, 7, 14],
  '9': [0, 4, 7, 10, 14],
  'm9': [0, 3, 7, 10, 14],
  '6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 21],
  'maj9': [0, 4, 7, 11, 14],
  '5': [0, 7],               // power chord
  'mmaj7': [0, 3, 7, 11],    // minor-major 7
};

/**
 * Get the note names that make up a chord.
 */
export function getChordNotes(root: number, quality: string, useFlats = false): string[] {
  const intervals = QUALITY_INTERVALS[quality] || QUALITY_INTERVALS[''];
  const names = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  return intervals.map(i => names[(root + i) % 12]);
}

/**
 * Get a human-readable quality name.
 */
export function getQualityName(quality: string): string {
  const names: Record<string, string> = {
    '': 'Major',
    'm': 'Minor',
    'min': 'Minor',
    '7': 'Dominant 7th',
    'maj7': 'Major 7th',
    'm7': 'Minor 7th',
    'min7': 'Minor 7th',
    'dim': 'Diminished',
    'dim7': 'Diminished 7th',
    'aug': 'Augmented',
    'sus2': 'Suspended 2nd',
    'sus4': 'Suspended 4th',
    'sus': 'Suspended 4th',
    'add9': 'Add 9',
    '9': 'Dominant 9th',
    'm9': 'Minor 9th',
    '6': 'Major 6th',
    'm6': 'Minor 6th',
    '11': '11th',
    '13': '13th',
    'maj9': 'Major 9th',
    '5': 'Power Chord',
    'mmaj7': 'Minor-Major 7th',
  };
  return names[quality] || quality;
}

// Guitar chord diagrams: [E, A, D, G, B, e] where -1 = muted, 0 = open
// Stored as fret positions for each string, with a base fret offset
export interface ChordDiagram {
  frets: number[];   // 6 values, -1 = muted, 0 = open, 1+ = fret
  baseFret: number;  // 1 for open position
  fingers?: number[]; // optional fingering
}

// Common open/first-position chord diagrams keyed by chord name
const CHORD_DIAGRAMS: Record<string, ChordDiagram> = {
  'C':    { frets: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
  'D':    { frets: [-1, -1, 0, 2, 3, 2], baseFret: 1 },
  'E':    { frets: [0, 2, 2, 1, 0, 0], baseFret: 1 },
  'F':    { frets: [1, 3, 3, 2, 1, 1], baseFret: 1 },
  'G':    { frets: [3, 2, 0, 0, 0, 3], baseFret: 1 },
  'A':    { frets: [-1, 0, 2, 2, 2, 0], baseFret: 1 },
  'B':    { frets: [-1, 2, 4, 4, 4, 2], baseFret: 1 },

  'Am':   { frets: [-1, 0, 2, 2, 1, 0], baseFret: 1 },
  'Bm':   { frets: [-1, 2, 4, 4, 3, 2], baseFret: 1 },
  'Cm':   { frets: [-1, 3, 5, 5, 4, 3], baseFret: 1 },
  'Dm':   { frets: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
  'Em':   { frets: [0, 2, 2, 0, 0, 0], baseFret: 1 },
  'Fm':   { frets: [1, 3, 3, 1, 1, 1], baseFret: 1 },
  'Gm':   { frets: [3, 5, 5, 3, 3, 3], baseFret: 1 },

  'C7':   { frets: [-1, 3, 2, 3, 1, 0], baseFret: 1 },
  'D7':   { frets: [-1, -1, 0, 2, 1, 2], baseFret: 1 },
  'E7':   { frets: [0, 2, 0, 1, 0, 0], baseFret: 1 },
  'G7':   { frets: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  'A7':   { frets: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
  'B7':   { frets: [-1, 2, 1, 2, 0, 2], baseFret: 1 },
  'F7':   { frets: [1, 3, 1, 2, 1, 1], baseFret: 1 },

  'Am7':  { frets: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
  'Dm7':  { frets: [-1, -1, 0, 2, 1, 1], baseFret: 1 },
  'Em7':  { frets: [0, 2, 0, 0, 0, 0], baseFret: 1 },

  'Cmaj7': { frets: [-1, 3, 2, 0, 0, 0], baseFret: 1 },
  'Dmaj7': { frets: [-1, -1, 0, 2, 2, 2], baseFret: 1 },
  'Fmaj7': { frets: [1, 3, 3, 2, 1, 0], baseFret: 1 },
  'Gmaj7': { frets: [3, 2, 0, 0, 0, 2], baseFret: 1 },

  'Csus4': { frets: [-1, 3, 3, 0, 1, 1], baseFret: 1 },
  'Dsus4': { frets: [-1, -1, 0, 2, 3, 3], baseFret: 1 },
  'Esus4': { frets: [0, 2, 2, 2, 0, 0], baseFret: 1 },
  'Asus4': { frets: [-1, 0, 2, 2, 3, 0], baseFret: 1 },
  'Dsus2': { frets: [-1, -1, 0, 2, 3, 0], baseFret: 1 },
  'Asus2': { frets: [-1, 0, 2, 2, 0, 0], baseFret: 1 },

  'F#m':  { frets: [2, 4, 4, 2, 2, 2], baseFret: 1 },
  'C#m':  { frets: [-1, 4, 6, 6, 5, 4], baseFret: 1 },
  'G#m':  { frets: [4, 6, 6, 4, 4, 4], baseFret: 1 },
  'Bbm':  { frets: [-1, 1, 3, 3, 2, 1], baseFret: 1 },
  'Ebm':  { frets: [-1, -1, 1, 3, 4, 2], baseFret: 1 },

  'Bb':   { frets: [-1, 1, 3, 3, 3, 1], baseFret: 1 },
  'Eb':   { frets: [-1, -1, 1, 3, 4, 3], baseFret: 1 },
  'Ab':   { frets: [4, 6, 6, 5, 4, 4], baseFret: 1 },
  'Db':   { frets: [-1, 4, 6, 6, 6, 4], baseFret: 1 },
  'Gb':   { frets: [2, 4, 4, 3, 2, 2], baseFret: 1 },
  'F#':   { frets: [2, 4, 4, 3, 2, 2], baseFret: 1 },
  'C#':   { frets: [-1, 4, 6, 6, 6, 4], baseFret: 1 },
  'G#':   { frets: [4, 6, 6, 5, 4, 4], baseFret: 1 },

  'Bdim': { frets: [-1, 2, 3, 4, 3, -1], baseFret: 1 },

  'Cadd9': { frets: [-1, 3, 2, 0, 3, 0], baseFret: 1 },
  'Gadd9': { frets: [3, 0, 0, 0, 0, 3], baseFret: 1 },
};

// Enharmonic equivalents for lookup
const ENHARMONIC: Record<string, string> = {
  'A#': 'Bb', 'Db': 'C#', 'D#': 'Eb', 'Gb': 'F#', 'Ab': 'G#',
};

// Standard tuning open string notes (low to high)
const STANDARD_OPEN = [4, 9, 2, 7, 11, 4]; // E A D G B E

/**
 * Look up a chord diagram by name, trying enharmonic equivalents.
 */
function lookupDiagram(name: string): ChordDiagram | null {
  if (CHORD_DIAGRAMS[name]) return CHORD_DIAGRAMS[name];

  for (const [from, to] of Object.entries(ENHARMONIC)) {
    if (name.startsWith(from)) {
      const alt = to + name.slice(from.length);
      if (CHORD_DIAGRAMS[alt]) return CHORD_DIAGRAMS[alt];
    }
    if (name.startsWith(to)) {
      const alt = from + name.slice(to.length);
      if (CHORD_DIAGRAMS[alt]) return CHORD_DIAGRAMS[alt];
    }
  }

  return null;
}

/**
 * Build a slash chord diagram by taking the base chord and finding
 * the bass note on the lowest available string.
 */
function buildSlashChordDiagram(baseName: string, bassNote: number): ChordDiagram | null {
  const base = lookupDiagram(baseName);
  if (!base) return null;

  const frets = [...base.frets];

  // Find the lowest string that can play the bass note at a reasonable fret.
  // Try strings 0 (low E) and 1 (A) first.
  let placed = false;
  for (let s = 0; s <= 1; s++) {
    const openNote = STANDARD_OPEN[s];
    // Fret needed to produce the bass note on this string
    const fret = ((bassNote - openNote) % 12 + 12) % 12;

    // Accept open or frets 1-5
    if (fret <= 5) {
      frets[s] = fret;
      // Mute any strings lower than this that aren't part of the chord
      for (let lower = 0; lower < s; lower++) {
        if (frets[lower] === -1 || frets[lower] === 0) {
          // Check if the open string happens to be the bass note
          if (STANDARD_OPEN[lower] % 12 !== bassNote) {
            frets[lower] = -1;
          }
        }
      }
      placed = true;
      break;
    }
  }

  if (!placed) return null;

  return { frets, baseFret: base.baseFret };
}

/**
 * Look up a chord diagram by chord name, including slash chords.
 * Custom per-sheet overrides are checked first.
 */
export function getChordDiagram(chordName: string, customChords?: CustomChordDiagram[]): ChordDiagram | null {
  // Check custom overrides first
  if (customChords) {
    const custom = customChords.find(c => c.name === chordName);
    if (custom) {
      return { frets: custom.frets, baseFret: custom.baseFret };
    }
  }

  // Try exact match first (handles pre-defined slash chords too)
  const exact = lookupDiagram(chordName);
  if (exact) return exact;

  // Handle slash chords: "Am/G", "C/E", etc.
  const slashIndex = chordName.indexOf('/');
  if (slashIndex > 0) {
    const baseName = chordName.slice(0, slashIndex);
    const bassStr = chordName.slice(slashIndex + 1);
    const bassNote = NOTE_TO_INDEX[bassStr];

    if (bassNote !== undefined) {
      return buildSlashChordDiagram(baseName, bassNote);
    }
  }

  return null;
}
