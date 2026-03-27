import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChordSheetService } from '../../../core/services/chord-sheet.service';
import { ChordLineComponent } from '../../../shared/components/chord-line/chord-line.component';
import { NashvilleGridComponent } from '../../../shared/components/nashville-grid/nashville-grid.component';
import { parseContent, parseKey, getScaleInfo, parseNashvilleContent } from '@shared/music/theory';
import { TUNINGS, getUniformTuningOffset, isUniformTuning } from '@shared/music/tunings';
import type { ChordSheet, Note, TuningName } from '@shared/types/index';

@Component({
  selector: 'app-sheet-viewer',
  standalone: true,
  imports: [ChordLineComponent, NashvilleGridComponent, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      @if (loading()) {
        <p class="text-gray-500">Loading...</p>
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

            <!-- Sounding / Shapes Toggle (shown when capo or uniform alternate tuning with chordsAsShapes) -->
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

            <!-- Actions -->
            @if (sheet()!.shareToken) {
              <button (click)="copyShareLink()"
                class="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:border-gray-300"
                [class]="copied() ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-700'">
                {{ copied() ? 'Copied!' : 'Copy Link' }}
              </button>
              <button (click)="toggleShare()"
                class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md hover:border-gray-300 text-gray-700">
                Unshare
              </button>
            } @else {
              <button (click)="toggleShare()"
                class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md hover:border-gray-300 text-gray-700">
                Share
              </button>
            }
            <a [routerLink]="['/sheets', sheet()!.id, 'edit']"
              class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md hover:border-gray-300 text-gray-700">
              Edit
            </a>
            <button (click)="deleteSheet()"
              class="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 border border-gray-200 rounded-md hover:border-red-200">
              Delete
            </button>
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

        <!-- Sheet Content + Notes Column -->
        <div class="flex gap-6 items-start">
          <div class="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg p-6 chord-display text-sm leading-relaxed">
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
                  [keyString]="sheet()!.key || ''"
                  [noteActive]="activeNoteIndex() === $index"
                  (noteClick)="toggleNote($index)" />
              }
            }
          </div>

          <!-- Notes Column -->
          @if (activeNoteIndex() !== null && activeNote()) {
            <div class="w-64 flex-shrink-0 sticky top-8">
              <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm text-amber-900 italic">{{ activeNote() }}</p>
                  <button (click)="toggleNote(activeNoteIndex()!)"
                    class="text-amber-400 hover:text-amber-600 text-lg leading-none flex-shrink-0">&times;</button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SheetViewerComponent implements OnInit {
  sheet = signal<ChordSheet | null>(null);
  loading = signal(true);
  copied = signal(false);
  semitones = signal(0);
  mode = signal<'chord' | 'roman'>('chord');
  viewTab = signal<'lyrics' | 'nashville'>('lyrics');
  showSounding = signal(false);
  activeNoteIndex = signal<number | null>(null);

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

  // The original key root, unmodified — used for sharp/flat preference
  originalKeyRoot = computed((): Note | null => {
    const s = this.sheet();
    if (!s?.key) return null;
    return parseKey(s.key);
  });

  // Key root adjusted for shape space when needed — used for Roman numerals
  keyRoot = computed((): Note | null => {
    const s = this.sheet();
    if (!s?.key) return null;
    const root = parseKey(s.key);
    if (root === null) return null;

    // When chordsAsShapes is true and we're NOT showing sounding pitch,
    // the chords are in "shape space" but the key is the sounding key.
    // Shift the key into shape space so Roman numerals align correctly.
    // e.g. Key=A, half-step-down: shape space key = Bb, so Bb shape = I
    if (s.chordsAsShapes && !this.showSounding() && s.tuning && s.tuning !== 'standard') {
      const offset = getUniformTuningOffset(s.tuning as TuningName);
      if (offset !== null && offset !== 0) {
        return ((root - offset) % 12 + 12) % 12;
      }
    }

    return root;
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

  // Show the toggle when there's a capo, or when chords are written as
  // shapes in a uniform alternate tuning (half-step/full-step down)
  hasShapesToggle = computed(() => {
    const s = this.sheet();
    if (!s) return false;
    if (s.capo) return true;
    if (s.chordsAsShapes && s.tuning && s.tuning !== 'standard') {
      return isUniformTuning(s.tuning as TuningName);
    }
    return false;
  });

  // Calculate the total semitone adjustment:
  // - User transpose offset
  // - When "Sounding" is active and chords are shapes, add capo + tuning offset
  //   to convert shapes → sounding pitch
  // - When "Shapes" is active (default), show chords as written
  effectiveSemitones = computed(() => {
    const s = this.sheet();
    let offset = this.semitones();

    if (this.showSounding() && s) {
      // Add capo offset (capo raises pitch)
      if (s.capo) {
        offset += s.capo;
      }
      // Add tuning offset if chords are written as shapes
      // (e.g. half-step-down: tuning offset is -1, so sounding = shape - 1)
      if (s.chordsAsShapes && s.tuning && s.tuning !== 'standard') {
        const tuningOffset = getUniformTuningOffset(s.tuning as TuningName);
        if (tuningOffset !== null) {
          offset += tuningOffset;
        }
      }
    }

    return offset;
  });

  constructor(
    private sheetService: ChordSheetService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.sheetService.get(id).subscribe({
      next: (sheet) => {
        this.sheet.set(sheet);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  transposeUp() {
    this.semitones.update(s => s + 1);
  }

  transposeDown() {
    this.semitones.update(s => s - 1);
  }

  toggleMode() {
    this.mode.update(m => m === 'chord' ? 'roman' : 'chord');
  }

  toggleViewTab() {
    this.viewTab.update(t => t === 'lyrics' ? 'nashville' : 'lyrics');
  }

  toggleSoundingShapes() {
    this.showSounding.update(v => !v);
  }

  activeNote = computed(() => {
    const idx = this.activeNoteIndex();
    if (idx === null) return null;
    const lines = this.parsedLines();
    return lines[idx]?.note || null;
  });

  toggleNote(index: number) {
    this.activeNoteIndex.update(current => current === index ? null : index);
  }

  toggleShare() {
    const s = this.sheet();
    if (!s) return;

    const action = s.shareToken
      ? this.sheetService.unshare(s.id)
      : this.sheetService.share(s.id);

    action.subscribe({
      next: (updated) => this.sheet.set(updated),
    });
  }

  copyShareLink() {
    const token = this.sheet()?.shareToken;
    if (!token) return;
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  deleteSheet() {
    const s = this.sheet();
    if (!s || !confirm('Are you sure you want to delete this sheet?')) return;

    this.sheetService.delete(s.id).subscribe({
      next: () => this.router.navigate(['/sheets']),
    });
  }
}
