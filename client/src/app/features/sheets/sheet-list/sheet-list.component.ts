import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChordSheetService } from '../../../core/services/chord-sheet.service';
import type { ChordSheet } from '@shared/types/index';

type SortField = 'title' | 'artist' | 'updatedAt';

@Component({
  selector: 'app-sheet-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">My Chord Sheets</h1>
        <a routerLink="/sheets/new"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium text-sm">
          + New Sheet
        </a>
      </div>

      @if (loading()) {
        <p class="text-gray-500">Loading...</p>
      } @else if (sheets().length === 0) {
        <div class="text-center py-16 text-gray-500">
          <p class="text-lg mb-2">No chord sheets yet</p>
          <p class="text-sm">Create your first chord sheet to get started.</p>
        </div>
      } @else {
        <div class="flex items-center gap-2 mb-4 text-sm">
          <span class="text-gray-500">Sort by:</span>
          <button (click)="toggleSort('title')"
            [class]="sortField() === 'title' ? 'px-3 py-1 rounded-md font-medium bg-indigo-100 text-indigo-700' : 'px-3 py-1 rounded-md text-gray-600 hover:bg-gray-100'">
            Title {{ sortField() === 'title' ? (sortAsc() ? '↑' : '↓') : '' }}
          </button>
          <button (click)="toggleSort('artist')"
            [class]="sortField() === 'artist' ? 'px-3 py-1 rounded-md font-medium bg-indigo-100 text-indigo-700' : 'px-3 py-1 rounded-md text-gray-600 hover:bg-gray-100'">
            Artist {{ sortField() === 'artist' ? (sortAsc() ? '↑' : '↓') : '' }}
          </button>
          <button (click)="toggleSort('updatedAt')"
            [class]="sortField() === 'updatedAt' ? 'px-3 py-1 rounded-md font-medium bg-indigo-100 text-indigo-700' : 'px-3 py-1 rounded-md text-gray-600 hover:bg-gray-100'">
            Recent {{ sortField() === 'updatedAt' ? (sortAsc() ? '↑' : '↓') : '' }}
          </button>
        </div>

        <div class="flex flex-col gap-2">
          @for (sheet of sortedSheets(); track sheet.id) {
            <a [routerLink]="['/sheets', sheet.id]"
              class="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all">
              <div class="flex-1 min-w-0">
                <h2 class="font-semibold text-gray-900 truncate">{{ sheet.title }}</h2>
                @if (sheet.artist) {
                  <p class="text-sm text-gray-500 mt-0.5">{{ sheet.artist }}</p>
                }
              </div>
              @if (sheet.key) {
                <span class="shrink-0 px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded">
                  Key: {{ sheet.key }}
                </span>
              }
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class SheetListComponent implements OnInit {
  sheets = signal<ChordSheet[]>([]);
  loading = signal(true);
  sortField = signal<SortField>('updatedAt');
  sortAsc = signal(false);

  sortedSheets = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    return [...this.sheets()].sort((a, b) => {
      const aVal = a[field] as string | undefined;
      const bVal = b[field] as string | undefined;
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;
      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
      return asc ? cmp : -cmp;
    });
  });

  constructor(private sheetService: ChordSheetService) {}

  toggleSort(field: SortField) {
    if (this.sortField() === field) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortField.set(field);
      this.sortAsc.set(field !== 'updatedAt');
    }
  }

  ngOnInit() {
    this.sheetService.list().subscribe({
      next: (sheets) => {
        this.sheets.set(sheets);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
