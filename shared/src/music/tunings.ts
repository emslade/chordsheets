import type { TuningName } from '../types/index.js';

export interface Tuning {
  name: TuningName;
  label: string;
  // Open string notes as semitone indices (low to high: 6th string to 1st)
  notes: number[];
}

// Standard tuning: E A D G B E
export const TUNINGS: Record<TuningName, Tuning> = {
  'standard':        { name: 'standard',        label: 'Standard (EADGBE)',         notes: [4, 9, 2, 7, 11, 4] },
  'drop-d':          { name: 'drop-d',          label: 'Drop D (DADGBE)',           notes: [2, 9, 2, 7, 11, 4] },
  'open-g':          { name: 'open-g',          label: 'Open G (DGDGBD)',           notes: [2, 7, 2, 7, 11, 2] },
  'open-d':          { name: 'open-d',          label: 'Open D (DADF#AD)',          notes: [2, 9, 2, 6, 9, 2] },
  'open-e':          { name: 'open-e',          label: 'Open E (EBEG#BE)',          notes: [4, 11, 4, 8, 11, 4] },
  'dadgad':          { name: 'dadgad',          label: 'DADGAD',                    notes: [2, 9, 2, 7, 9, 2] },
  'half-step-down':  { name: 'half-step-down',  label: 'Half Step Down (Eb)',       notes: [3, 8, 1, 6, 10, 3] },
  'full-step-down':  { name: 'full-step-down',  label: 'Full Step Down (D)',        notes: [2, 7, 0, 5, 9, 2] },
};

export const STANDARD_TUNING = TUNINGS['standard'];

/**
 * Get the semitone offset between standard tuning and another tuning for each string.
 * Positive = tuned higher, negative = tuned lower.
 */
export function getTuningOffsets(tuning: TuningName): number[] {
  const target = TUNINGS[tuning];
  return target.notes.map((note, i) => {
    const diff = note - STANDARD_TUNING.notes[i];
    // Normalize to range [-6, 5] to pick shortest interval
    return ((diff + 18) % 12) - 6;
  });
}

/**
 * Get the uniform semitone offset for a tuning, or null if the tuning
 * is non-uniform (e.g. Drop D where only the 6th string changes).
 * For half-step-down this returns -1, full-step-down returns -2, etc.
 */
export function getUniformTuningOffset(tuning: TuningName): number | null {
  if (tuning === 'standard') return 0;
  const offsets = getTuningOffsets(tuning);
  const first = offsets[0];
  return offsets.every(o => o === first) ? first : null;
}

/**
 * Whether a tuning has a uniform pitch offset (all strings shift equally).
 */
export function isUniformTuning(tuning: TuningName): boolean {
  return getUniformTuningOffset(tuning) !== null;
}

/**
 * Adjust a standard-tuning chord diagram's frets for a different tuning.
 * Returns null if the chord can't be reasonably adapted.
 */
export function adjustDiagramForTuning(
  frets: number[],
  baseFret: number,
  tuning: TuningName,
): { frets: number[]; baseFret: number } | null {
  if (tuning === 'standard') return { frets, baseFret };

  const offsets = getTuningOffsets(tuning);
  const adjusted = frets.map((fret, i) => {
    if (fret === -1) return -1; // muted stays muted
    // In standard tuning, fret N on string i gives note: standardNote[i] + N
    // In the new tuning, to get the same note: newFret = fret - offset
    const newFret = fret - offsets[i];
    if (newFret < 0) return -1; // can't play below nut
    return newFret;
  });

  // Find the minimum fretted position (ignoring open and muted)
  const fretted = adjusted.filter(f => f > 0);
  if (fretted.length === 0) return { frets: adjusted, baseFret: 1 };

  const minFret = Math.min(...fretted);
  const maxFret = Math.max(...fretted);

  // If span is too wide (> 4 frets), diagram isn't playable
  if (maxFret - minFret > 4) return null;

  // Normalize to a reasonable base fret
  let newBaseFret = 1;
  let normalizedFrets = adjusted;
  if (minFret > 3) {
    newBaseFret = minFret;
    normalizedFrets = adjusted.map(f => {
      if (f <= 0) return f; // open or muted
      return f - minFret + 1;
    });
  }

  return { frets: normalizedFrets, baseFret: newBaseFret };
}
