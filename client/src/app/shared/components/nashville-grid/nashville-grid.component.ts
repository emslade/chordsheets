import { Component, Input } from '@angular/core';
import { ChordTooltipComponent } from '../chord-tooltip/chord-tooltip.component';
import type { NashvilleLine, NashvilleBeat, Chord, Note, TuningName, CustomChordDiagram } from '@shared/types/index';
import { renderNashvilleBeat, nashvilleBeatToChord } from '@shared/music/theory';

@Component({
  selector: 'app-nashville-grid',
  standalone: true,
  imports: [ChordTooltipComponent],
  template: `
    @for (line of lines; track $index) {
      @if (line.isSection) {
        <div class="mt-6 mb-2 font-bold text-gray-700 text-base">{{ line.sectionName }}</div>
      } @else if (line.bars.length > 0) {
        <div class="flex mb-1 font-mono text-sm">
          <span class="text-gray-400 leading-8">|</span>
          @for (bar of line.bars; track $index) {
            <span class="px-3 py-1 min-w-[4rem] text-center leading-8 border-r border-gray-300">
              @for (beat of bar.beats; track $index; let last = $last) {
                <span class="relative inline-block cursor-pointer group">
                  <span class="text-indigo-700 font-bold">{{ renderBeat(beat) }}</span>
                  @if (keyRoot !== null) {
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block">
                      <app-chord-tooltip
                        [chord]="beatToChord(beat)"
                        [semitones]="0"
                        [tuning]="tuning"
                        [chordsAsShapes]="chordsAsShapes"
                        [keyRoot]="keyRoot"
                        [keyString]="keyString"
                        [customChords]="customChords" />
                    </div>
                  }
                </span>
                @if (!last) {
                  <span class="text-gray-400 mx-1">.</span>
                }
              }
            </span>
          }
        </div>
      } @else {
        <div class="h-4"></div>
      }
    }
  `,
})
export class NashvilleGridComponent {
  @Input() lines!: NashvilleLine[];
  @Input() keyRoot: Note | null = null;
  @Input() tuning: TuningName = 'standard';
  @Input() chordsAsShapes = false;
  @Input() keyString = '';
  @Input() customChords?: CustomChordDiagram[];

  renderBeat(beat: NashvilleBeat): string {
    return renderNashvilleBeat(beat);
  }

  beatToChord(beat: NashvilleBeat): Chord {
    return nashvilleBeatToChord(beat, this.keyRoot!);
  }
}
