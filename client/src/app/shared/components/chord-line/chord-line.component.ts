import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ChordTooltipComponent } from '../chord-tooltip/chord-tooltip.component';
import type { ParsedLine, Note, Chord, TuningName, CustomChordDiagram } from '@shared/types/index';
import { transpose, renderChord, toRomanNumeral, shouldUseFlats, shouldUseFlatsForKey } from '@shared/music/theory';

interface RenderedSegment {
  chord: Chord | null;
  chordText: string;
  lyricText: string;
  width: number; // character width for alignment
}

@Component({
  selector: 'app-chord-line',
  standalone: true,
  imports: [ChordTooltipComponent],
  template: `
    <div
      [class]="line.note ? 'cursor-pointer rounded px-1 -mx-1 transition-colors ' + (noteActive ? 'bg-amber-100' : 'bg-amber-50 hover:bg-amber-100') : ''"
      (click)="line.note ? noteClick.emit() : null">
      @if (line.isSection) {
        <div class="mt-6 mb-2 font-bold text-gray-700 text-base">{{ line.sectionName }}</div>
      } @else if (isChordsOnly()) {
        <div class="mb-2 flex gap-3">
          @for (seg of getSegments(); track $index) {
            @if (seg.chord) {
              <span class="relative inline-block cursor-pointer group text-indigo-600 font-bold">
                {{ seg.chordText.trim() }}
                <div class="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block">
                  <app-chord-tooltip [chord]="seg.chord" [semitones]="semitones" [tuning]="tuning" [chordsAsShapes]="chordsAsShapes" [keyRoot]="originalKeyRoot" [keyString]="keyString" [customChords]="customChords" />
                </div>
              </span>
            }
          }
        </div>
      } @else if (hasChords()) {
        <div class="mb-3">
          <div class="flex">
            @for (seg of getSegments(); track $index) {
              @if (seg.chord) {
                <span class="relative inline-block cursor-pointer group"
                  [style.min-width.ch]="seg.width">
                  <span class="text-indigo-600 font-bold block whitespace-pre">{{ seg.chordText }}</span>
                  <span class="block whitespace-pre">{{ seg.lyricText }}</span>
                  <div class="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block">
                    <app-chord-tooltip [chord]="seg.chord" [semitones]="semitones" [tuning]="tuning" [chordsAsShapes]="chordsAsShapes" [keyRoot]="originalKeyRoot" [keyString]="keyString" [customChords]="customChords" />
                  </div>
                </span>
              } @else {
                <span class="inline-block" [style.min-width.ch]="seg.width">
                  <span class="block whitespace-pre">&nbsp;</span>
                  <span class="block whitespace-pre">{{ seg.lyricText }}</span>
                </span>
              }
            }
          </div>
        </div>
      } @else {
        <div class="mb-1 whitespace-pre">{{ getLyricRow() }}</div>
      }
    </div>
  `,
})
export class ChordLineComponent {
  @Input() line!: ParsedLine;
  @Input() semitones = 0;
  @Input() mode: 'chord' | 'roman' = 'chord';
  @Input() keyRoot: Note | null = null;
  @Input() tuning: TuningName = 'standard';
  @Input() chordsAsShapes = false;
  @Input() originalKeyRoot: Note | null = null;
  @Input() customChords?: CustomChordDiagram[];
  @Input() keyString = '';
  @Input() noteActive = false;
  @Output() noteClick = new EventEmitter<void>();

  hasChords(): boolean {
    return this.line.segments.some(s => !!s.chord);
  }

  isChordsOnly(): boolean {
    if (!this.hasChords()) return false;
    return this.line.segments.every(s => !s.lyric.trim());
  }

  getSegments(): RenderedSegment[] {
    return this.line.segments.map(segment => {
      if (segment.chord) {
        const transposed = transpose(segment.chord, this.semitones);
        let chordText: string;
        if (this.mode === 'roman' && this.keyRoot !== null) {
          chordText = toRomanNumeral(transposed, this.keyRoot, this.keyString.endsWith('m'));
        } else {
          const useFlats = this.keyString
            ? shouldUseFlatsForKey(this.keyString)
            : shouldUseFlats(transposed.root);
          chordText = renderChord(transposed, useFlats);
        }
        const width = Math.max(chordText.length + 1, segment.lyric.length + 1);
        return {
          chord: segment.chord,
          chordText: chordText.padEnd(width),
          lyricText: segment.lyric.padEnd(width),
          width,
        };
      } else {
        return {
          chord: null,
          chordText: '',
          lyricText: segment.lyric,
          width: segment.lyric.length,
        };
      }
    });
  }

  getLyricRow(): string {
    return this.line.segments.map(s => s.lyric).join('');
  }
}
