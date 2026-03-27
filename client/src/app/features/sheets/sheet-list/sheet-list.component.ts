import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChordSheetService } from '../../../core/services/chord-sheet.service';
import type { ChordSheet } from '@shared/types/index';

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
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (sheet of sheets(); track sheet.id) {
            <a [routerLink]="['/sheets', sheet.id]"
              class="block p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all">
              <h2 class="font-semibold text-gray-900 truncate">{{ sheet.title }}</h2>
              @if (sheet.artist) {
                <p class="text-sm text-gray-500 mt-1">{{ sheet.artist }}</p>
              }
              @if (sheet.key) {
                <span class="inline-block mt-2 px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded">
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

  constructor(private sheetService: ChordSheetService) {}

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
