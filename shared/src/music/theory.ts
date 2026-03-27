import { Chord, LineSegment, Note, ParsedLine, NashvilleBeat, NashvilleBar, NashvilleLine } from '../types/index.js';
import {
  NOTE_TO_INDEX,
  NOTE_NAMES_SHARP,
  NOTE_NAMES_FLAT,
  FLAT_KEYS,
  MAJOR_SCALE_INTERVALS,
  MINOR_SCALE_INTERVALS,
  INTERVAL_TO_DEGREE,
  DEGREE_TO_INTERVAL,
} from './constants.js';

/**
 * Parse a chord string like "Am7", "C#dim", "G/B" into a Chord object.
 */
export function parseChord(raw: string): Chord | null {
  const match = raw.match(
    /^([A-G][#b]?)(m(?:in|aj)?|maj|dim|aug|sus[24]?|add)?([\d]*(?:\/[\d]+)?)?(?:\/([A-G][#b]?))?\s*$/
  );

  if (!match) return null;

  const [, rootStr, quality = '', extension = '', bassStr] = match;
  const rootIndex = NOTE_TO_INDEX[rootStr];

  if (rootIndex === undefined) return null;

  let fullQuality = quality + extension;

  const chord: Chord = {
    root: rootIndex,
    quality: fullQuality,
    original: raw,
  };

  if (bassStr) {
    const bassIndex = NOTE_TO_INDEX[bassStr];
    if (bassIndex !== undefined) {
      chord.bass = bassIndex;
    }
  }

  return chord;
}

/**
 * Determine whether to use flats based on a key root note.
 */
export function shouldUseFlats(keyRoot: Note): boolean {
  return FLAT_KEYS.has(keyRoot);
}

/**
 * Determine whether to use flats based on how the key was written.
 * "F#" / "F#m" → sharps, "Gb" / "Gbm" → flats.
 * For natural keys (C, D, G, etc.), falls back to conventional preference.
 */
export function shouldUseFlatsForKey(keyStr: string): boolean {
  if (keyStr.includes('b')) return true;
  if (keyStr.includes('#')) return false;
  const root = parseKey(keyStr);
  return root !== null ? FLAT_KEYS.has(root) : false;
}

/**
 * Render a note index back to a string name.
 */
export function noteName(note: Note, useFlats: boolean): string {
  return useFlats ? NOTE_NAMES_FLAT[note] : NOTE_NAMES_SHARP[note];
}

/**
 * Transpose a chord by a number of semitones.
 */
export function transpose(chord: Chord, semitones: number): Chord {
  const newRoot = ((chord.root + semitones) % 12 + 12) % 12;
  const newBass = chord.bass !== undefined
    ? ((chord.bass + semitones) % 12 + 12) % 12
    : undefined;

  return {
    ...chord,
    root: newRoot,
    bass: newBass,
  };
}

/**
 * Render a Chord object back to a string like "Am7" or "C#dim/G".
 */
export function renderChord(chord: Chord, useFlats: boolean): string {
  let result = noteName(chord.root, useFlats) + chord.quality;
  if (chord.bass !== undefined) {
    result += '/' + noteName(chord.bass, useFlats);
  }
  return result;
}

/**
 * Convert a chord to Roman numeral notation given a key.
 */
export function toRomanNumeral(chord: Chord, keyRoot: Note): string {
  const interval = ((chord.root - keyRoot) % 12 + 12) % 12;
  let numeral = INTERVAL_TO_DEGREE[interval] || '?';

  // Determine if chord is minor-like
  const isMinor = chord.quality.startsWith('m') && !chord.quality.startsWith('maj');
  const isDim = chord.quality.includes('dim');
  const isAug = chord.quality.includes('aug');

  if (isMinor || isDim) {
    numeral = numeral.toLowerCase();
  }

  // Append quality indicators
  if (isDim) {
    numeral += '°';
  } else if (isAug) {
    numeral += '+';
  }

  // Append extensions (7, maj7, 9, etc.)
  const extMatch = chord.quality.match(/(\d+(?:\/\d+)?)/);
  if (extMatch) {
    numeral += extMatch[1];
  }

  // Handle sus
  if (chord.quality.includes('sus')) {
    const susMatch = chord.quality.match(/(sus[24]?)/);
    if (susMatch) {
      numeral += susMatch[1];
    }
  }

  // Handle bass note as Roman numeral too
  if (chord.bass !== undefined) {
    const bassInterval = ((chord.bass - keyRoot) % 12 + 12) % 12;
    let bassNumeral = INTERVAL_TO_DEGREE[bassInterval] || '?';
    numeral += '/' + bassNumeral;
  }

  return numeral;
}

/**
 * Parse a Roman numeral chord string like "IV", "ii", "V7", "bVII" into a Chord object.
 * Lowercase numerals are treated as minor. Requires a key root to resolve to absolute pitch.
 */
export function parseRomanNumeral(raw: string, keyRoot: Note): Chord | null {
  const match = raw.match(
    /^([#b]?)(III|VII|II|IV|VI|I|V|iii|vii|ii|iv|vi|i|v)(°|\+|dim|aug|sus[24]?|add)?([\d]*(?:\/[\d]+)?)?(?:\/([#b]?(?:III|VII|II|IV|VI|I|V|iii|vii|ii|iv|vi|i|v)))?\s*$/
  );

  if (!match) return null;

  const [, accidental, numeral, qualityMod = '', extension = '', bassNumeral] = match;

  // Resolve degree to interval
  const upperNumeral = accidental.toUpperCase() + numeral.toUpperCase();
  const interval = DEGREE_TO_INTERVAL[upperNumeral];
  if (interval === undefined) return null;

  const root = ((keyRoot + interval) % 12 + 12) % 12;

  // Determine quality from case and modifiers
  const isLowerCase = numeral === numeral.toLowerCase();
  let quality = '';

  if (qualityMod === '°' || qualityMod === 'dim') {
    quality = 'dim';
  } else if (qualityMod === '+' || qualityMod === 'aug') {
    quality = 'aug';
  } else if (qualityMod.startsWith('sus')) {
    quality = qualityMod;
  } else if (qualityMod === 'add') {
    quality = 'add';
  } else if (isLowerCase) {
    quality = 'm';
  }

  quality += extension;

  const chord: Chord = { root, quality, original: raw };

  // Handle bass as Roman numeral
  if (bassNumeral) {
    const upperBass = bassNumeral.toUpperCase();
    const bassInterval = DEGREE_TO_INTERVAL[upperBass];
    if (bassInterval !== undefined) {
      chord.bass = ((keyRoot + bassInterval) % 12 + 12) % 12;
    }
  }

  return chord;
}

/**
 * Parse bracket-notation content into structured lines.
 * Format: "[Am]Imagine [C]all the [G]people"
 * Section headers: "{section: Chorus}" or "{Chorus}"
 * When keyRoot is provided, Roman numeral notation (e.g. [iv], [V7]) is also supported.
 */
export function parseContent(content: string, keyRoot?: Note): ParsedLine[] {
  const lines = content.split('\n');
  const result: ParsedLine[] = [];

  for (const line of lines) {
    // Check for note annotations: {note: Play softly here}
    const noteMatch = line.match(/^\{note:\s*(.+)\}\s*$/);
    if (noteMatch) {
      // Attach note to the previous line if one exists
      if (result.length > 0) {
        result[result.length - 1].note = noteMatch[1].trim();
      }
      continue;
    }

    // Check for section headers: {Chorus}, {section: Chorus}, or [Intro], [Verse 2], etc.
    const sectionMatch = line.match(/^\{(?:section:\s*)?(.+)\}\s*$/);
    if (sectionMatch) {
      result.push({
        segments: [],
        isSection: true,
        sectionName: sectionMatch[1].trim(),
      });
      continue;
    }

    // Bracket-style section headers: [Intro], [Verse], [Chorus], [Bridge], etc.
    const bracketSectionMatch = line.match(
      /^\[(Intro|Verse|Chorus|Pre[- ]?Chorus|Bridge|Outro|Interlude|Solo|Instrumental|Tag|Coda|Hook|Refrain|Break)(\s*\d+)?\]\s*$/i
    );
    if (bracketSectionMatch) {
      result.push({
        segments: [],
        isSection: true,
        sectionName: bracketSectionMatch[1] + (bracketSectionMatch[2] || ''),
      });
      continue;
    }

    // Parse chord/lyric segments
    const segments: LineSegment[] = [];
    const regex = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      // Text before this chord (belongs to previous chord or is standalone)
      if (match.index > lastIndex) {
        const textBefore = line.slice(lastIndex, match.index);
        if (segments.length > 0) {
          // Append to previous segment's lyric
          segments[segments.length - 1].lyric += textBefore;
        } else {
          // Text before any chord
          segments.push({ lyric: textBefore });
        }
      }

      const chord = parseChord(match[1])
        || (keyRoot !== undefined ? parseRomanNumeral(match[1], keyRoot) : null);
      segments.push({
        chord: chord || undefined,
        lyric: '',
      });

      // If chord didn't parse, keep the original text
      if (!chord) {
        segments[segments.length - 1].lyric = `[${match[1]}]`;
        segments[segments.length - 1].chord = undefined;
      }

      lastIndex = regex.lastIndex;
    }

    // Remaining text after last chord
    if (lastIndex < line.length) {
      const remaining = line.slice(lastIndex);
      if (segments.length > 0) {
        segments[segments.length - 1].lyric += remaining;
      } else {
        segments.push({ lyric: remaining });
      }
    }

    // Empty line
    if (segments.length === 0) {
      segments.push({ lyric: '' });
    }

    result.push({ segments });
  }

  return result;
}

/**
 * Parse a Nashville number beat token like "1", "6m", "4maj7", "5/3" into a NashvilleBeat.
 */
export function parseNashvilleBeat(token: string): NashvilleBeat | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^([#b]?)(\d)(m(?:aj)?|maj|dim|aug|sus[24]?|add)?([\d]*)(?:\/([#b]?\d))?$/
  );
  if (!match) return null;

  const [, accidental, degreeStr, qualityMod = '', extension = '', bassStr] = match;
  const degree = parseInt(degreeStr, 10);
  if (degree < 1 || degree > 7) return null;

  const quality = qualityMod + extension;

  const beat: NashvilleBeat = {
    degree,
    quality,
    original: trimmed,
  };

  if (bassStr) {
    const bassMatch = bassStr.match(/^([#b]?)(\d)$/);
    if (bassMatch) {
      beat.bass = parseInt(bassMatch[2], 10);
    }
  }

  return beat;
}

/**
 * Parse Nashville number notation content into structured lines.
 * Format: "| 1 | 4 | 1 | 5 |"
 * Multiple beats per bar separated by dots: "| 1 . 5/7 | 1 |"
 * Section headers use same bracket notation: [Verse], [Chorus], {Bridge}, etc.
 */
export function parseNashvilleContent(content: string): NashvilleLine[] {
  const lines = content.split('\n');
  const result: NashvilleLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for section headers: {Chorus}, {section: Chorus}
    const sectionMatch = trimmed.match(/^\{(?:section:\s*)?(.+)\}\s*$/);
    if (sectionMatch) {
      result.push({
        bars: [],
        isSection: true,
        sectionName: sectionMatch[1].trim(),
      });
      continue;
    }

    // Bracket-style section headers: [Intro], [Verse], [Chorus], etc.
    const bracketSectionMatch = trimmed.match(
      /^\[(Intro|Verse|Chorus|Pre[- ]?Chorus|Bridge|Outro|Interlude|Solo|Instrumental|Tag|Coda|Hook|Refrain|Break)(\s*\d+)?\]\s*$/i
    );
    if (bracketSectionMatch) {
      result.push({
        bars: [],
        isSection: true,
        sectionName: bracketSectionMatch[1] + (bracketSectionMatch[2] || ''),
      });
      continue;
    }

    // Skip empty lines
    if (!trimmed) {
      result.push({ bars: [] });
      continue;
    }

    // Parse bar line: split by | and parse each bar
    // Strip leading/trailing pipes and split
    const barContent = trimmed.replace(/^\||\|$/g, '').trim();
    if (!barContent) {
      result.push({ bars: [] });
      continue;
    }

    const barStrings = barContent.split('|');
    const bars: NashvilleBar[] = [];

    for (const barStr of barStrings) {
      const trimmedBar = barStr.trim();
      if (!trimmedBar) continue;

      // Split beats by dots or spaces
      const beatTokens = trimmedBar.split(/\s*\.\s*/).filter(t => t.trim());
      const beats: NashvilleBeat[] = [];

      for (const token of beatTokens) {
        const beat = parseNashvilleBeat(token.trim());
        if (beat) {
          beats.push(beat);
        }
      }

      if (beats.length > 0) {
        bars.push({ beats });
      }
    }

    result.push({ bars });
  }

  return result;
}

/**
 * Render a Nashville beat back to display string.
 */
export function renderNashvilleBeat(beat: NashvilleBeat): string {
  let result = beat.degree + beat.quality;
  if (beat.bass !== undefined) {
    result += '/' + beat.bass;
  }
  return result;
}

/**
 * Convert a Nashville beat to an absolute Chord given a key root.
 * Uses the major scale intervals to resolve degree → note.
 */
export function nashvilleBeatToChord(beat: NashvilleBeat, keyRoot: Note): Chord {
  const interval = MAJOR_SCALE_INTERVALS[beat.degree - 1] ?? 0;
  const root = ((keyRoot + interval) % 12 + 12) % 12;

  const chord: Chord = {
    root,
    quality: beat.quality,
    original: beat.original,
  };

  if (beat.bass !== undefined) {
    const bassInterval = MAJOR_SCALE_INTERVALS[beat.bass - 1] ?? 0;
    chord.bass = ((keyRoot + bassInterval) % 12 + 12) % 12;
  }

  return chord;
}

/**
 * Parse a key string like "C", "Am", "F#m" into a root note index.
 * Returns the note index or null if invalid.
 */
export function parseKey(key: string): Note | null {
  const match = key.match(/^([A-G][#b]?)m?$/);
  if (!match) return null;
  const index = NOTE_TO_INDEX[match[1]];
  return index !== undefined ? index : null;
}

/**
 * Get the scale notes for a given key string (e.g. "C" → ["C","D","E","F","G","A","B"]).
 * Supports major and minor keys (e.g. "Am" → ["A","B","C","D","E","F","G"]).
 */
export function getScaleNotes(keyStr: string): string[] | null {
  const root = parseKey(keyStr);
  if (root === null) return null;
  const isMinor = keyStr.endsWith('m');
  const intervals = isMinor ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS;
  const useFlats = shouldUseFlatsForKey(keyStr);
  return intervals.map(i => noteName((root + i) % 12 as Note, useFlats));
}

export interface ScaleDegree {
  note: string;
  numeral: string;
  major: boolean;
}

// Chord qualities per scale degree: true = major, false = minor/diminished
const MAJOR_QUALITIES = [true, false, false, true, true, false, false] as const;
const MINOR_QUALITIES = [false, false, true, false, false, true, true] as const;

const MAJOR_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_NUMERALS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

/**
 * Get structured scale info: note name, roman numeral, and whether it's major.
 */
export function getScaleInfo(keyStr: string): ScaleDegree[] | null {
  const root = parseKey(keyStr);
  if (root === null) return null;
  const isMinor = keyStr.endsWith('m');
  const intervals = isMinor ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS;
  const useFlats = shouldUseFlatsForKey(keyStr);
  const qualities = isMinor ? MINOR_QUALITIES : MAJOR_QUALITIES;
  const numerals = isMinor ? MINOR_NUMERALS : MAJOR_NUMERALS;
  return intervals.map((interval, i) => ({
    note: noteName((root + interval) % 12 as Note, useFlats),
    numeral: numerals[i],
    major: qualities[i],
  }));
}

/**
 * Render parsed lines back to display strings.
 * Used for generating display text with transposition/Roman numerals applied.
 */
export function renderLine(
  line: ParsedLine,
  semitones: number,
  mode: 'chord' | 'roman',
  keyRoot?: Note,
  useFlats?: boolean,
): { chords: string; lyrics: string } | { section: string } {
  if (line.isSection) {
    return { section: line.sectionName || '' };
  }

  let chordStr = '';
  let lyricStr = '';

  for (const segment of line.segments) {
    const lyric = segment.lyric;

    if (segment.chord) {
      const transposed = transpose(segment.chord, semitones);
      let chordText: string;

      if (mode === 'roman' && keyRoot !== undefined) {
        chordText = toRomanNumeral(transposed, keyRoot);
      } else {
        const flats = useFlats !== undefined ? useFlats : shouldUseFlats(transposed.root);
        chordText = renderChord(transposed, flats);
      }

      // Pad chord or lyric so they align
      const maxLen = Math.max(chordText.length, lyric.length);
      chordStr += chordText.padEnd(maxLen + 1);
      lyricStr += lyric.padEnd(maxLen + 1);
    } else {
      chordStr += ' '.repeat(lyric.length);
      lyricStr += lyric;
    }
  }

  return { chords: chordStr.trimEnd(), lyrics: lyricStr.trimEnd() };
}
