import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChordSheetService } from '../../../core/services/chord-sheet.service';
import { ChordLineComponent } from '../../../shared/components/chord-line/chord-line.component';
import { NashvilleGridComponent } from '../../../shared/components/nashville-grid/nashville-grid.component';
import { parseContent, parseKey, getScaleInfo, parseNashvilleContent } from '@shared/music/theory';
import { TUNINGS, getUniformTuningOffset, isUniformTuning } from '@shared/music/tunings';
import { computeDisplayKeyRoot } from '@shared/music/display';
import type { ChordSheet, Note, TuningName } from '@shared/types/index';

@Component({
  selector: 'app-shared-viewer',
  standalone: true,
  imports: [ChordLineComponent, NashvilleGridComponent],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      @if (loading()) {
        <p class="text-gray-500">Loading...</p>
      } @else if (notFound()) {
        <div class="text-center py-16">
          <h1 class="text-2xl font-bold text-gray-400 mb-2">Sheet not found</h1>
          <p class="text-gray-500">This shared link may have expired or been removed.</p>
        </div>
      } @else if (sheet()) {
        <!-- Toolbar -->
        <div class="flex flex-wrap items-center justify-between mb-6 gap-4 no-print">
          <div>
            <h1 class="text-2xl font-bold">{{ sheet()!.title }}</h1>
            @if (sheet()!.artist) {
              <p class="text-gray-500">{{ sheet()!.artist }}</p>
            }
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <!-- Transpose Controls -->
            <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1">
              <button (click)="transposeDown()" class="px-2 py-1 text-gray-600 hover:text-gray-900 font-bold">-</button>
              <span class="text-sm text-gray-700 min-w-[3rem] text-center">
                {{ semitones() === 0 ? 'Original' : (semitones() > 0 ? '+' : '') + semitones() }}
              </span>
              <button (click)="transposeUp()" class="px-2 py-1 text-gray-600 hover:text-gray-900 font-bold">+</button>
            </div>

            <!-- Sounding / Shapes Toggle -->
            @if (hasShapesToggle()) {
              <div class="flex rounded-md border border-gray-200 overflow-hidden">
                <button (click)="showSounding.set(false)"
                  class="px-3 py-1.5 text-sm"
                  [class]="!showSounding()
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'">
                  Shapes
                </button>
                <button (click)="showSounding.set(true)"
                  class="px-3 py-1.5 text-sm border-l border-gray-200"
                  [class]="showSounding()
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'">
                  Sounding
                </button>
              </div>
            }

            <!-- Chords / Roman Toggle -->
            @if (keyRoot() !== null) {
              <div class="flex rounded-md border border-gray-200 overflow-hidden">
                <button (click)="mode.set('chord')"
                  class="px-3 py-1.5 text-sm"
                  [class]="mode() === 'chord'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'">
                  Chords
                </button>
                <button (click)="mode.set('roman')"
                  class="px-3 py-1.5 text-sm border-l border-gray-200"
                  [class]="mode() === 'roman'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'">
                  Roman
                </button>
              </div>
            }

            <!-- Lyrics / Nashville Toggle -->
            @if (sheet()!.nashvilleContent) {
              <div class="flex rounded-md border border-gray-200 overflow-hidden">
                <button (click)="viewTab.set('lyrics')"
                  class="px-3 py-1.5 text-sm"
                  [class]="viewTab() === 'lyrics'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'">
                  Lyrics
                </button>
                <button (click)="viewTab.set('nashville')"
                  class="px-3 py-1.5 text-sm border-l border-gray-200"
                  [class]="viewTab() === 'nashville'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'">
                  Nashville
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Metadata badges -->
        <div class="flex gap-3 mb-4 flex-wrap no-print">
          @if (sheet()!.key) {
            <span class="text-sm px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded inline-flex items-center gap-2">
              Key: {{ sheet()!.key }}
              @if (scaleInfo()) {
                <span class="inline-flex gap-2 ml-1">
                  @for (deg of scaleInfo(); track deg.note) {
                    <span class="inline-flex flex-col items-center leading-tight">
                      <span class="text-[10px] text-indigo-400">{{ deg.numeral }}</span>
                      <span [class]="deg.major ? 'font-bold' : 'font-normal'">{{ deg.note }}</span>
                    </span>
                  }
                </span>
              }
            </span>
          }
          @if (sheet()!.capo) {
            <span class="text-sm px-2 py-0.5 bg-amber-50 text-amber-700 rounded">
              Capo: fret {{ sheet()!.capo }}
            </span>
          }
          @if (sheet()!.tuning && sheet()!.tuning !== 'standard') {
            <span class="text-sm px-2 py-0.5 bg-green-50 text-green-700 rounded">
              {{ tuningLabel() }}
            </span>
          }
          @if (sheet()!.chordsAsShapes && sheet()!.tuning && sheet()!.tuning !== 'standard') {
            <span class="text-sm px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              Chords written as shapes
            </span>
          }
        </div>

        <!-- Sheet Content -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 chord-display text-sm leading-relaxed">
          @if (viewTab() === 'nashville') {
            <app-nashville-grid [lines]="parsedNashvilleLines()" [keyRoot]="keyRoot()" [tuning]="sheet()!.tuning || 'standard'" [chordsAsShapes]="sheet()!.chordsAsShapes !== false" [keyString]="sheet()!.key || ''" [customChords]="sheet()!.customChords" />
          } @else {
            @for (line of parsedLines(); track $index) {
              <app-chord-line
                [line]="line"
                [semitones]="effectiveSemitones()"
                [mode]="mode()"
                [keyRoot]="keyRoot()"
                [tuning]="sheet()!.tuning || 'standard'"
                [chordsAsShapes]="sheet()!.chordsAsShapes !== false"
                [originalKeyRoot]="originalKeyRoot()"
                [customChords]="sheet()!.customChords"
                [keyString]="sheet()!.key || ''" />
            }
          }
        </div>
      }
    </div>
  `,
})
export class SharedViewerComponent implements OnInit, OnDestroy {
  sheet = signal<ChordSheet | null>(null);
  loading = signal(true);
  notFound = signal(false);
  private eventSource?: EventSource;
  semitones = signal(0);
  mode = signal<'chord' | 'roman'>('chord');
  viewTab = signal<'lyrics' | 'nashville'>('lyrics');
  showSounding = signal(false);

  parsedLines = computed(() => {
    const s = this.sheet();
    if (!s) return [];
    const key = s.key ? parseKey(s.key) : undefined;
    return parseContent(s.content, key ?? undefined);
  });

  parsedNashvilleLines = computed(() => {
    const s = this.sheet();
    if (!s?.nashvilleContent) return [];
    return parseNashvilleContent(s.nashvilleContent);
  });

  originalKeyRoot = computed((): Note | null => {
    const s = this.sheet();
    if (!s?.key) return null;
    return parseKey(s.key);
  });

  keyRoot = computed((): Note | null => {
    const s = this.sheet();
    if (!s?.key) return null;
    const root = parseKey(s.key);
    if (root === null) return null;
    return computeDisplayKeyRoot({
      keyRoot: root,
      showSounding: this.showSounding(),
      chordsAsShapes: !!s.chordsAsShapes,
      capo: s.capo,
      tuning: (s.tuning as TuningName | undefined) ?? null,
    });
  });

  tuningLabel = computed(() => {
    const s = this.sheet();
    const t = s?.tuning || 'standard';
    return TUNINGS[t as TuningName]?.label || t;
  });

  scaleInfo = computed(() => {
    const s = this.sheet();
    if (!s?.key) return null;
    return getScaleInfo(s.key);
  });

  hasShapesToggle = computed(() => {
    const s = this.sheet();
    if (!s) return false;
    if (s.capo) return true;
    if (s.chordsAsShapes && s.tuning && s.tuning !== 'standard') {
      return isUniformTuning(s.tuning as TuningName);
    }
    return false;
  });

  effectiveSemitones = computed(() => {
    const s = this.sheet();
    let offset = this.semitones();
    if (this.showSounding() && s) {
      if (s.capo) offset += s.capo;
      if (s.chordsAsShapes && s.tuning && s.tuning !== 'standard') {
        const tuningOffset = getUniformTuningOffset(s.tuning as TuningName);
        if (tuningOffset !== null) offset += tuningOffset;
      }
    }
    return offset;
  });

  constructor(
    private sheetService: ChordSheetService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token')!;
    this.sheetService.getShared(token).subscribe({
      next: (sheet) => {
        this.sheet.set(sheet);
        this.loading.set(false);
        this.connectSSE(token);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy() {
    this.eventSource?.close();
  }

  private connectSSE(token: string) {
    this.eventSource = new EventSource(`/api/shared/${token}/events`);
    this.eventSource.addEventListener('sheet-update', (e: MessageEvent) => {
      const sheet = JSON.parse(e.data);
      this.sheet.set(sheet);
    });
  }

  transposeUp() { this.semitones.update(s => s + 1); }
  transposeDown() { this.semitones.update(s => s - 1); }
}
