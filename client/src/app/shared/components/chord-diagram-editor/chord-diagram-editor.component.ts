import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { CustomChordDiagram } from '@shared/types/index';

@Component({
  selector: 'app-chord-diagram-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="border border-gray-200 rounded-md p-3 bg-gray-50">
      <div class="flex items-center gap-3 mb-3">
        <input type="text" [(ngModel)]="chord.name" (ngModelChange)="emitChange()"
          placeholder="Chord name (e.g. Am7)"
          class="px-2 py-1 border border-gray-300 rounded text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button (click)="remove.emit()" class="text-red-500 hover:text-red-700 text-xs">Remove</button>
      </div>

      <div class="flex items-start gap-4">
        <!-- Fret inputs -->
        <div class="grid grid-cols-6 gap-1 text-center text-xs">
          <span class="text-gray-400">E</span>
          <span class="text-gray-400">A</span>
          <span class="text-gray-400">D</span>
          <span class="text-gray-400">G</span>
          <span class="text-gray-400">B</span>
          <span class="text-gray-400">e</span>
          @for (i of stringIndices; track i) {
            <input type="number" [ngModel]="chord.frets[i]" (ngModelChange)="setFret(i, $event)"
              min="-1" max="24"
              class="w-10 px-1 py-0.5 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          }
        </div>

        <!-- Base fret -->
        <div class="text-xs">
          <label class="text-gray-500 block mb-1">Base fret</label>
          <input type="number" [(ngModel)]="chord.baseFret" (ngModelChange)="emitChange()"
            min="1" max="20"
            class="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>

        <!-- Preview -->
        <div class="flex justify-center" [innerHTML]="previewSvg"></div>
      </div>

      <div class="mt-2 text-xs text-gray-400">-1 = muted, 0 = open, 1+ = fret number</div>
    </div>
  `,
})
export class ChordDiagramEditorComponent {
  @Input() chord!: CustomChordDiagram;
  @Output() change = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  stringIndices = [0, 1, 2, 3, 4, 5];
  previewSvg: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges() {
    this.updatePreview();
  }

  setFret(index: number, value: number) {
    this.chord.frets[index] = value;
    this.emitChange();
  }

  emitChange() {
    this.updatePreview();
    this.change.emit();
  }

  private updatePreview() {
    if (!this.chord) return;
    const d = this.chord;
    const strings = 6;
    const frets = 4;
    const sx = 16;
    const sy = 20;
    const sw = 14;
    const sh = 16;
    const w = sx + (strings - 1) * sw + 16;
    const h = sy + frets * sh + 8;

    let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;

    if (d.baseFret === 1) {
      svg += `<line x1="${sx}" y1="${sy}" x2="${sx + (strings - 1) * sw}" y2="${sy}" stroke="#333" stroke-width="3"/>`;
    } else {
      svg += `<text x="${sx - 10}" y="${sy + sh / 2 + 3}" fill="#666" font-size="9" text-anchor="middle">${d.baseFret}</text>`;
    }

    for (let i = 0; i < strings; i++) {
      const x = sx + i * sw;
      svg += `<line x1="${x}" y1="${sy}" x2="${x}" y2="${sy + frets * sh}" stroke="#ccc" stroke-width="1"/>`;
    }
    for (let i = 0; i <= frets; i++) {
      const y = sy + i * sh;
      svg += `<line x1="${sx}" y1="${y}" x2="${sx + (strings - 1) * sw}" y2="${y}" stroke="#ccc" stroke-width="1"/>`;
    }

    for (let i = 0; i < strings; i++) {
      const x = sx + i * sw;
      const fret = d.frets[i];
      if (fret === -1) {
        svg += `<text x="${x}" y="${sy - 4}" fill="#999" font-size="10" text-anchor="middle" font-weight="bold">×</text>`;
      } else if (fret === 0) {
        svg += `<circle cx="${x}" cy="${sy - 8}" r="3" fill="none" stroke="#333" stroke-width="1.5"/>`;
      } else {
        const adj = fret - (d.baseFret - 1);
        if (adj > 0 && adj <= frets) {
          const y = sy + (adj - 0.5) * sh;
          svg += `<circle cx="${x}" cy="${y}" r="5" fill="#4f46e5"/>`;
        }
      }
    }

    svg += '</svg>';
    this.previewSvg = this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
