import { describe, it, expect } from 'vitest';
import { toRomanNumeral, parseChord } from './theory.js';

const chord = (s: string) => parseChord(s)!;

// Note indices: C=0 ... A=9 ... B=11
const C = 0;
const A = 9;

describe('toRomanNumeral', () => {
  describe('major key', () => {
    it('renders diatonic chords with no accidentals', () => {
      expect(toRomanNumeral(chord('C'), C)).toBe('I');
      expect(toRomanNumeral(chord('Dm'), C)).toBe('ii');
      expect(toRomanNumeral(chord('Em'), C)).toBe('iii');
      expect(toRomanNumeral(chord('F'), C)).toBe('IV');
      expect(toRomanNumeral(chord('G'), C)).toBe('V');
      expect(toRomanNumeral(chord('Am'), C)).toBe('vi');
    });

    it('flats non-diatonic chords on lowered degrees', () => {
      expect(toRomanNumeral(chord('Eb'), C)).toBe('bIII');
      expect(toRomanNumeral(chord('Ab'), C)).toBe('bVI');
      expect(toRomanNumeral(chord('Bb'), C)).toBe('bVII');
    });

    it('appends extension and dim/aug markers', () => {
      expect(toRomanNumeral(chord('G7'), C)).toBe('V7');
      expect(toRomanNumeral(chord('Bdim'), C)).toBe('vii°');
    });
  });

  describe('minor key (keyIsMinor=true)', () => {
    // Am natural minor: i ii° III iv v VI VII (A B C D E F G)
    it('renders the natural minor diatonic chords without flats', () => {
      expect(toRomanNumeral(chord('Am'), A, true)).toBe('i');
      expect(toRomanNumeral(chord('C'), A, true)).toBe('III');
      expect(toRomanNumeral(chord('Dm'), A, true)).toBe('iv');
      expect(toRomanNumeral(chord('Em'), A, true)).toBe('v');
      expect(toRomanNumeral(chord('F'), A, true)).toBe('VI');
      expect(toRomanNumeral(chord('G'), A, true)).toBe('VII');
    });

    it('renders ii° on the natural-minor 2nd', () => {
      expect(toRomanNumeral(chord('Bdim'), A, true)).toBe('ii°');
    });

    it('treats raised chromatic alterations with #', () => {
      // G#dim — the harmonic minor leading-tone diminished
      expect(toRomanNumeral(chord('G#dim'), A, true)).toBe('#vii°');
    });

    it('handles power chords on natural-minor degrees', () => {
      expect(toRomanNumeral(chord('A5'), A, true)).toBe('I5');
      expect(toRomanNumeral(chord('F5'), A, true)).toBe('VI5');
      expect(toRomanNumeral(chord('G5'), A, true)).toBe('VII5');
      expect(toRomanNumeral(chord('C5'), A, true)).toBe('III5');
    });
  });

  describe('keyIsMinor defaults to false', () => {
    it('uses major map when called with two args', () => {
      expect(toRomanNumeral(chord('F'), A)).toBe('bVI');
      expect(toRomanNumeral(chord('G'), A)).toBe('bVII');
    });
  });
});
