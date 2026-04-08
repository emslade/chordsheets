import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { ChordSheetService } from '../../../core/services/chord-sheet.service';
import { ChordLineComponent } from '../../../shared/components/chord-line/chord-line.component';
import { NashvilleGridComponent } from '../../../shared/components/nashville-grid/nashville-grid.component';
import { parseContent, parseKey, parseNashvilleContent } from '@shared/music/theory';
import { TUNINGS, isUniformTuning, getUniformTuningOffset } from '@shared/music/tunings';
import { NOTE_NAMES_FLAT } from '@shared/music/constants';
import type { TuningName, CustomChordDiagram } from '@shared/types/index';
import { ChordDiagramEditorComponent } from '../../../shared/components/chord-diagram-editor/chord-diagram-editor.component';

@Component({
  selector: 'app-sheet-editor',
  standalone: true,
  imports: [FormsModule, ChordLineComponent, ChordDiagramEditorComponent, NashvilleGridComponent],
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">{{ isEditing() ? 'Edit' : 'New' }} Chord Sheet</h1>
        <div class="flex items-center gap-3">
          @if (isEditing()) {
            <span class="text-sm" [class]="saveStatus() === 'error' ? 'text-red-600' : 'text-gray-400'">
              {{ saveStatusText() }}
            </span>
          }
          <button (click)="goBack()" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            {{ isEditing() ? 'Done' : 'Cancel' }}
          </button>
          @if (!isEditing()) {
            <button (click)="save()" [disabled]="saving()"
              class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          }
        </div>
      </div>

      @if (error()) {
        <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{{ error() }}</div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Editor Panel -->
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" [(ngModel)]="title" (ngModelChange)="onFieldChange()" name="title" placeholder="Song title"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Artist</label>
              <input type="text" [(ngModel)]="artist" (ngModelChange)="onFieldChange()" name="artist" placeholder="Artist name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Key</label>
              <select [(ngModel)]="key" (ngModelChange)="onFieldChange()" name="key"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">None</option>
                @for (k of keyOptions; track k) {
                  <option [value]="k">{{ k }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Capo</label>
              <select [(ngModel)]="capo" (ngModelChange)="onFieldChange()" name="capo"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option [ngValue]="0">None</option>
                @for (fret of capoFrets; track fret) {
                  <option [ngValue]="fret">Fret {{ fret }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tuning</label>
              <select [(ngModel)]="tuning" (ngModelChange)="onFieldChange()" name="tuning"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                @for (t of tuningOptions; track t.name) {
                  <option [ngValue]="t.name">{{ t.label }}</option>
                }
              </select>
            </div>
          </div>
          @if (showChordsAsShapesOption) {
            <label class="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" [(ngModel)]="chordsAsShapes" (ngModelChange)="onFieldChange()" name="chordsAsShapes"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              Chords written as shapes
              <span class="text-gray-400">(e.g. write D for a D shape even though it sounds as {{ shapesExampleNote }})</span>
            </label>
          }
          <!-- Custom Chord Diagrams -->
          <div>
            <button (click)="showCustomChords = !showCustomChords" type="button"
              class="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              <span class="text-xs">{{ showCustomChords ? '▼' : '▶' }}</span>
              Custom chord diagrams ({{ customChords.length }})
            </button>
            @if (showCustomChords) {
              <div class="mt-2 space-y-3">
                @for (chord of customChords; track $index) {
                  <app-chord-diagram-editor
                    [chord]="chord"
                    (change)="onCustomChordsChange()"
                    (remove)="removeCustomChord($index)" />
                }
                <button (click)="addCustomChord()" type="button"
                  class="text-sm px-3 py-1 border border-dashed border-gray-300 rounded-md text-gray-500 hover:border-indigo-400 hover:text-indigo-600">
                  + Add custom chord
                </button>
              </div>
            }
          </div>

          <div>
            <div class="flex gap-1 mb-2">
              <button (click)="editorTab = 'lyrics'" type="button"
                class="px-3 py-1.5 text-sm rounded-md border"
                [class]="editorTab === 'lyrics'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'">
                Lyrics / Chords
              </button>
              <button (click)="editorTab = 'nashville'" type="button"
                class="px-3 py-1.5 text-sm rounded-md border"
                [class]="editorTab === 'nashville'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'">
                Nashville
              </button>
            </div>
            @if (editorTab === 'lyrics') {
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Content
                <span class="font-normal text-gray-400 ml-1">Use [Am] or [iv] bracket notation for chords</span>
              </label>
              <textarea [(ngModel)]="content" (ngModelChange)="onFieldChange()" name="content" rows="24" placeholder="[Am]Imagine [C]all the [G]people&#10;[Am]Living [C]for to[G]day"
                class="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"></textarea>
            } @else {
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Nashville Chart
                <span class="font-normal text-gray-400 ml-1">Use | for bars and . to split beats</span>
              </label>
              <textarea [(ngModel)]="nashvilleContent" (ngModelChange)="onFieldChange()" name="nashvilleContent" rows="24" placeholder="[Verse]&#10;| 1 | 4 | 1 | 5 |&#10;| 1 | 4 | 5 | 1 |&#10;&#10;[Chorus]&#10;| 4 | 5 | 1 | 6m |&#10;| 4 | 5 . 5/7 | 1 |"
                class="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"></textarea>
            }
          </div>
        </div>

        <!-- Preview Panel -->
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Preview</h2>
          @if (previewTitle) {
            <h3 class="text-xl font-bold mb-1">{{ previewTitle }}</h3>
          }
          @if (artist) {
            <p class="text-sm text-gray-500 mb-2">{{ artist }}</p>
          }
          <div class="flex gap-2 mb-4 flex-wrap">
            @if (capo) {
              <span class="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">Capo: fret {{ capo }}</span>
            }
            @if (tuning !== 'standard') {
              <span class="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded">{{ getTuningLabel(tuning) }}</span>
            }
          </div>
          <div class="chord-display text-sm leading-relaxed">
            @if (editorTab === 'lyrics') {
              @for (line of parsedLines; track $index) {
                <app-chord-line [line]="line" [semitones]="0" [mode]="'chord'" [keyRoot]="keyRoot" [tuning]="tuning" [chordsAsShapes]="chordsAsShapes" [originalKeyRoot]="keyRoot" [customChords]="customChords" [keyString]="key" />
              }
            } @else {
              <app-nashville-grid [lines]="parsedNashvilleLines" [keyRoot]="keyRoot" [tuning]="tuning" [chordsAsShapes]="chordsAsShapes" [keyString]="key" [customChords]="customChords" />
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SheetEditorComponent implements OnInit, OnDestroy {
  title = '';
  artist = '';
  key = '';
  capo = 0;
  tuning: TuningName = 'standard';
  chordsAsShapes = true;
  customChords: CustomChordDiagram[] = [];
  showCustomChords = false;
  content = '';
  nashvilleContent = '';
  editorTab: 'lyrics' | 'nashville' = 'lyrics';
  error = signal('');
  saving = signal(false);
  isEditing = signal(false);
  saveStatus = signal<'saved' | 'unsaved' | 'saving' | 'error' | ''>('');
  saveStatusText = signal('');
  private sheetId = '';
  private autoSave$ = new Subject<void>();
  private autoSaveSub?: Subscription;
  private loaded = false;

  capoFrets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  keyOptions = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm',
  ];
  tuningOptions = Object.values(TUNINGS);

  get parsedLines() { return parseContent(this.content, this.keyRoot ?? undefined); }
  get parsedNashvilleLines() { return parseNashvilleContent(this.nashvilleContent); }
  get previewTitle() { return this.title; }
  get keyRoot() { return this.key ? parseKey(this.key) : null; }

  get showChordsAsShapesOption() {
    return this.tuning !== 'standard' && isUniformTuning(this.tuning);
  }

  get shapesExampleNote() {
    const offset = getUniformTuningOffset(this.tuning);
    if (offset === null) return '';
    const sounding = ((2 + offset) % 12 + 12) % 12;
    return NOTE_NAMES_FLAT[sounding];
  }

  constructor(
    private sheetService: ChordSheetService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.autoSaveSub = this.autoSave$.pipe(debounceTime(1500)).subscribe(() => this.autoSave());

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.sheetId = id;
      this.isEditing.set(true);
      this.sheetService.get(id).subscribe({
        next: (sheet) => {
          this.title = sheet.title;
          this.artist = sheet.artist || '';
          this.key = sheet.key || '';
          this.capo = sheet.capo || 0;
          this.tuning = (sheet.tuning as TuningName) || 'standard';
          this.chordsAsShapes = sheet.chordsAsShapes !== false;
          this.customChords = sheet.customChords || [];
          this.showCustomChords = this.customChords.length > 0;
          this.content = sheet.content;
          this.nashvilleContent = sheet.nashvilleContent || '';
          this.loaded = true;
        },
        error: () => this.error.set('Failed to load sheet'),
      });
    }
  }

  ngOnDestroy() {
    this.autoSaveSub?.unsubscribe();
  }

  onFieldChange() {
    if (!this.isEditing() || !this.loaded) return;
    this.saveStatus.set('unsaved');
    this.saveStatusText.set('Unsaved changes');
    this.autoSave$.next();
  }

  getTuningLabel(name: TuningName): string {
    return TUNINGS[name]?.label || name;
  }

  addCustomChord() {
    this.customChords.push({
      name: '',
      frets: [0, 0, 0, 0, 0, 0],
      baseFret: 1,
    });
  }

  removeCustomChord(index: number) {
    this.customChords.splice(index, 1);
    this.onFieldChange();
  }

  onCustomChordsChange() {
    // Trigger change detection
    this.customChords = [...this.customChords];
    this.onFieldChange();
  }

  private buildDto() {
    const validCustomChords = this.customChords.filter(c => c.name.trim());
    return {
      title: this.title,
      artist: this.artist || undefined,
      key: this.key || undefined,
      capo: this.capo || undefined,
      tuning: this.tuning !== 'standard' ? this.tuning : undefined,
      chordsAsShapes: this.chordsAsShapes,
      customChords: validCustomChords.length > 0 ? validCustomChords : undefined,
      content: this.content,
      nashvilleContent: this.nashvilleContent || undefined,
    };
  }

  private autoSave() {
    if (!this.title.trim()) return;

    this.saveStatus.set('saving');
    this.saveStatusText.set('Saving...');

    this.sheetService.update(this.sheetId, this.buildDto()).subscribe({
      next: () => {
        this.saveStatus.set('saved');
        this.saveStatusText.set('Saved');
      },
      error: () => {
        this.saveStatus.set('error');
        this.saveStatusText.set('Save failed');
      },
    });
  }

  save() {
    if (!this.title.trim()) {
      this.error.set('Title is required');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    this.sheetService.create(this.buildDto()).subscribe({
      next: (sheet) => {
        this.router.navigate(['/sheets', sheet.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save');
      },
    });
  }

  goBack() {
    if (this.isEditing()) {
      this.router.navigate(['/sheets', this.sheetId]);
    } else {
      this.router.navigate(['/sheets']);
    }
  }
}
