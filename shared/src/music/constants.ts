export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

// Keys that conventionally use flats
export const FLAT_KEYS = new Set([1, 3, 5, 6, 8, 10]); // Db, Eb, F, Gb, Ab, Bb
// Also minor keys that use flats
export const FLAT_MINOR_KEYS = new Set([0, 2, 3, 5, 7, 8]); // Cm, Dm, Ebm(=D#m), Fm, Gm, Abm

// Map note names to semitone index
export const NOTE_TO_INDEX: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

// Diatonic intervals for major scale: W W H W W W H
export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Diatonic intervals for natural minor scale: W H W W H W W
export const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

// Roman numeral names for each scale degree
export const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Map semitone intervals to scale degrees (including chromatic)
export const INTERVAL_TO_DEGREE: Record<number, string> = {
  0: 'I',
  1: 'bII',
  2: 'II',
  3: 'bIII',
  4: 'III',
  5: 'IV',
  6: '#IV',
  7: 'V',
  8: 'bVI',
  9: 'VI',
  10: 'bVII',
  11: 'VII',
};

// Same idea but rooted in natural minor: III, VI, VII are the natural
// scale degrees at intervals 3, 8, 10. Chromatic alterations are written
// as raised forms (#III, #VI, #VII).
export const INTERVAL_TO_DEGREE_MINOR: Record<number, string> = {
  0: 'I',
  1: 'bII',
  2: 'II',
  3: 'III',
  4: '#III',
  5: 'IV',
  6: '#IV',
  7: 'V',
  8: 'VI',
  9: '#VI',
  10: 'VII',
  11: '#VII',
};

// Reverse map: scale degree (uppercase) to semitone interval
export const DEGREE_TO_INTERVAL: Record<string, number> = {
  'I': 0,
  'BII': 1,
  'II': 2,
  'BIII': 3,
  'III': 4,
  'IV': 5,
  '#IV': 6,
  'BV': 6,
  'V': 7,
  'BVI': 8,
  'VI': 9,
  'BVII': 10,
  'VII': 11,
};
