import type { Note, TuningName } from '../types/index.js';
import { getUniformTuningOffset } from './tunings.js';

export interface DisplayContext {
  keyRoot: Note;
  showSounding: boolean;
  chordsAsShapes: boolean;
  capo?: number | null;
  tuning?: TuningName | null;
}

/**
 * Compute the key root to use for Roman numeral conversion at display time.
 *
 * When `chordsAsShapes` is true, the stored key represents the player's
 * shape-space key (the key the chord shapes are written in). In Sounding
 * mode the chords are transposed by capo + tuning offset, so the key is
 * shifted by the same amount to keep Roman numerals aligned.
 */
export function computeDisplayKeyRoot(ctx: DisplayContext): Note {
  if (!ctx.chordsAsShapes || !ctx.showSounding) {
    return ctx.keyRoot;
  }
  let offset = 0;
  if (ctx.capo) offset += ctx.capo;
  if (ctx.tuning && ctx.tuning !== 'standard') {
    const tuningOffset = getUniformTuningOffset(ctx.tuning);
    if (tuningOffset !== null) offset += tuningOffset;
  }
  return (((ctx.keyRoot + offset) % 12) + 12) % 12;
}
