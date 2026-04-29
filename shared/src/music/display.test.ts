import { describe, it, expect } from 'vitest';
import { computeDisplayKeyRoot } from './display.js';

// Note indices: C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
const C = 0;
const B = 11;
const D = 2;
const A = 9;

describe('computeDisplayKeyRoot', () => {
  it('returns the key unchanged when nothing affects it', () => {
    expect(computeDisplayKeyRoot({
      keyRoot: C,
      showSounding: false,
      chordsAsShapes: false,
    })).toBe(C);
  });

  describe('chordsAsShapes + half-step-down tuning', () => {
    // The original bug: key C with half-step-down + shapes, switching to
    // Roman numerals must read C-shape as I (not bVII).
    it('Shapes mode: key C reads as C so C-shape = I', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: C,
        showSounding: false,
        chordsAsShapes: true,
        tuning: 'half-step-down',
      })).toBe(C);
    });

    it('Sounding mode: key C shifts down to B (sounding pitch)', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: C,
        showSounding: true,
        chordsAsShapes: true,
        tuning: 'half-step-down',
      })).toBe(B);
    });

    it('Sounding mode wraps below C: key C# shifts to C', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: 1, // C#
        showSounding: true,
        chordsAsShapes: true,
        tuning: 'half-step-down',
      })).toBe(C);
    });
  });

  describe('chordsAsShapes + full-step-down tuning', () => {
    it('Shapes mode leaves key unchanged', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: D,
        showSounding: false,
        chordsAsShapes: true,
        tuning: 'full-step-down',
      })).toBe(D);
    });

    it('Sounding mode shifts key down by two semitones', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: D,
        showSounding: true,
        chordsAsShapes: true,
        tuning: 'full-step-down',
      })).toBe(C);
    });
  });

  describe('chordsAsShapes + capo', () => {
    it('Shapes mode leaves key unchanged', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: C,
        showSounding: false,
        chordsAsShapes: true,
        capo: 2,
      })).toBe(C);
    });

    it('Sounding mode shifts key up by capo amount', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: C,
        showSounding: true,
        chordsAsShapes: true,
        capo: 2,
      })).toBe(D);
    });

    it('Sounding mode wraps past B', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: A, // 9
        showSounding: true,
        chordsAsShapes: true,
        capo: 5,
      })).toBe(D); // 9 + 5 = 14 → 2
    });
  });

  describe('chordsAsShapes + capo + tuning together', () => {
    it('Sounding mode combines capo and tuning offsets', () => {
      // capo +3 with half-step-down (-1) → net +2
      expect(computeDisplayKeyRoot({
        keyRoot: C,
        showSounding: true,
        chordsAsShapes: true,
        capo: 3,
        tuning: 'half-step-down',
      })).toBe(D);
    });
  });

  describe('chordsAsShapes false', () => {
    // When chords are stored as sounding pitches, the key is sounding too;
    // toggling Sounding mode does not change the key.
    it('Shapes mode unchanged with non-standard tuning', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: C,
        showSounding: false,
        chordsAsShapes: false,
        tuning: 'half-step-down',
      })).toBe(C);
    });

    it('Sounding mode unchanged with non-standard tuning', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: C,
        showSounding: true,
        chordsAsShapes: false,
        tuning: 'half-step-down',
      })).toBe(C);
    });

    it('Sounding mode unchanged with capo', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: C,
        showSounding: true,
        chordsAsShapes: false,
        capo: 3,
      })).toBe(C);
    });
  });

  describe('non-uniform tuning (e.g. drop-d)', () => {
    // Non-uniform tunings have no single offset; the key should not shift.
    it('Sounding mode leaves key unchanged for drop-d', () => {
      expect(computeDisplayKeyRoot({
        keyRoot: C,
        showSounding: true,
        chordsAsShapes: true,
        tuning: 'drop-d',
      })).toBe(C);
    });
  });

  it('treats explicit standard tuning as no offset', () => {
    expect(computeDisplayKeyRoot({
      keyRoot: C,
      showSounding: true,
      chordsAsShapes: true,
      tuning: 'standard',
    })).toBe(C);
  });
});
