import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { Chord, TuningName, Note, CustomChordDiagram } from '@shared/types/index';
import { renderChord, shouldUseFlats, shouldUseFlatsForKey, noteName } from '@shared/music/theory';
import { getChordNotes, getChordDiagram, getQualityName } from '@shared/music/chords';
import { adjustDiagramForTuning, TUNINGS, isUniformTuning, getUniformTuningOffset } from '@shared/music/tunings';

@Component({
  selector: 'app-chord-tooltip',
  standalone: true,
  template: `
    <div class="bg-gray-900 text-white rounded-lg shadow-xl p-3 min-w-[160px] font-sans">
      <div class="text-base font-bold mb-1">{{ chordName }}</div>
      <div class="text-xs text-gray-400 mb-1">{{ qualityName }}</div>
      <div class="text-xs text-gray-300 mb-1">Notes: {{ noteNames }}</div>
      @if (soundingNote && soundingNote !== chordName) {
        <div class="text-xs text-amber-400 mb-1">Sounds as: {{ soundingNote }}</div>
      }
      @if (tuning !== 'standard') {
        <div class="text-xs text-green-400 mb-2">{{ tuningLabel }}</div>
      }
      @if (diagramSvg) {
        <div class="flex justify-center" [innerHTML]="diagramSvg"></div>
      } @else {
        <div class="text-xs text-gray-500 italic">No diagram available</div>
      }
    </div>
  `,
})
export class ChordTooltipComponent implements OnChanges {
  @Input() chord!: Chord;
  @Input() semitones = 0;
  @Input() tuning: TuningName = 'standard';
  @Input() chordsAsShapes = false;
  @Input() keyRoot: Note | null = null;
  @Input() keyString = '';
  @Input() customChords?: CustomChordDiagram[];

  chordName = '';
  qualityName = '';
  noteNames = '';
  soundingNote = '';
  tuningLabel = '';
  diagramSvg: SafeHtml | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges() {
    if (!this.chord) return;

    const transposedRoot = ((this.chord.root + this.semitones) % 12 + 12) % 12;
    // Prefer the key string's sharp/flat preference when available
    const useFlats = this.keyString
      ? shouldUseFlatsForKey(this.keyString)
      : this.keyRoot !== null ? shouldUseFlats(this.keyRoot) : shouldUseFlats(transposedRoot);
    const transposed = { ...this.chord, root: transposedRoot };
    if (this.chord.bass !== undefined) {
      transposed.bass = ((this.chord.bass + this.semitones) % 12 + 12) % 12;
    }

    this.chordName = renderChord(transposed, useFlats);
    this.qualityName = getQualityName(this.chord.quality);
    this.tuningLabel = TUNINGS[this.tuning]?.label || '';

    // When chordsAsShapes is true, the displayed chord name is the shape.
    // Show what it actually sounds like with this tuning.
    if (this.chordsAsShapes && this.tuning !== 'standard') {
      const uniformOffset = getUniformTuningOffset(this.tuning);
      if (uniformOffset !== null && uniformOffset !== 0) {
        const soundingRoot = ((transposedRoot + uniformOffset) % 12 + 12) % 12;
        const soundingFlats = shouldUseFlats(soundingRoot);
        this.noteNames = getChordNotes(soundingRoot, this.chord.quality, useFlats).join(', ');
        const soundingChord = { ...transposed, root: soundingRoot };
        if (transposed.bass !== undefined) {
          soundingChord.bass = ((transposed.bass + uniformOffset) % 12 + 12) % 12;
        }
        this.soundingNote = renderChord(soundingChord, useFlats);
      } else {
        this.noteNames = getChordNotes(transposedRoot, this.chord.quality, useFlats).join(', ');
        this.soundingNote = '';
      }
    } else {
      this.noteNames = getChordNotes(transposedRoot, this.chord.quality, useFlats).join(', ');
      this.soundingNote = '';
    }

    // Determine which chord name to look up the diagram for, and whether
    // to adjust it for tuning.
    //
    // chordsAsShapes + uniform tuning (e.g. half-step down):
    //   The shape is the same as standard — look up the shape name,
    //   DON'T adjust (same fingering, just everything sounds lower).
    //
    // chordsAsShapes + non-uniform tuning (e.g. Drop D):
    //   The shape changes because strings are tuned differently —
    //   look up the shape name and DO adjust for the tuning.
    //
    // NOT chordsAsShapes (concert pitch):
    //   Look up the concert pitch chord and adjust for tuning.

    let diagramLookupName = this.chordName;
    let diagramTuning: TuningName = this.tuning;

    if (this.chordsAsShapes && isUniformTuning(this.tuning)) {
      // Shape is identical to standard tuning, no adjustment needed
      diagramTuning = 'standard';
    }

    const diagram = getChordDiagram(diagramLookupName, this.customChords);
    if (diagram) {
      const adjusted = adjustDiagramForTuning(diagram.frets, diagram.baseFret, diagramTuning);
      this.diagramSvg = adjusted
        ? this.sanitizer.bypassSecurityTrustHtml(this.renderDiagram(adjusted))
        : null;
    } else {
      this.diagramSvg = null;
    }
  }

  private renderDiagram(d: { frets: number[]; baseFret: number }): string {
    const strings = 6;
    const frets = 4;
    const sx = 20;
    const sy = 24;
    const sw = 16;
    const sh = 20;
    const w = sx + (strings - 1) * sw + 20;
    const h = sy + frets * sh + 10;

    let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;

    if (d.baseFret === 1) {
      svg += `<line x1="${sx}" y1="${sy}" x2="${sx + (strings - 1) * sw}" y2="${sy}" stroke="white" stroke-width="3"/>`;
    } else {
      svg += `<text x="${sx - 14}" y="${sy + sh / 2 + 4}" fill="white" font-size="10" text-anchor="middle">${d.baseFret}</text>`;
    }

    for (let i = 0; i < strings; i++) {
      const x = sx + i * sw;
      svg += `<line x1="${x}" y1="${sy}" x2="${x}" y2="${sy + frets * sh}" stroke="#666" stroke-width="1"/>`;
    }

    for (let i = 0; i <= frets; i++) {
      const y = sy + i * sh;
      svg += `<line x1="${sx}" y1="${y}" x2="${sx + (strings - 1) * sw}" y2="${y}" stroke="#666" stroke-width="1"/>`;
    }

    for (let i = 0; i < strings; i++) {
      const x = sx + i * sw;
      const fret = d.frets[i];

      if (fret === -1) {
        svg += `<text x="${x}" y="${sy - 6}" fill="#999" font-size="11" text-anchor="middle" font-weight="bold">×</text>`;
      } else if (fret === 0) {
        svg += `<circle cx="${x}" cy="${sy - 10}" r="4" fill="none" stroke="white" stroke-width="1.5"/>`;
      } else {
        const adjustedFret = fret - (d.baseFret - 1);
        const y = sy + (adjustedFret - 0.5) * sh;
        svg += `<circle cx="${x}" cy="${y}" r="6" fill="white"/>`;
      }
    }

    svg += '</svg>';
    return svg;
  }
}
