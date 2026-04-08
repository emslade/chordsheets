import { Component, input } from '@angular/core';
import type { ViewerPresence } from '@shared/types/index';

@Component({
  selector: 'app-viewer-avatars',
  standalone: true,
  template: `
    <div class="flex items-center -space-x-2">
      @for (viewer of viewers(); track viewer.id) {
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 border-white shadow-sm cursor-default"
             [style.background-color]="viewer.color"
             [title]="viewer.name">
          {{ viewer.animal }}
        </div>
      }
    </div>
  `,
})
export class ViewerAvatarsComponent {
  viewers = input<ViewerPresence[]>([]);
}
