import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col">
      <header class="bg-white border-b border-gray-200 no-print">
        <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a routerLink="/sheets" class="text-xl font-bold text-indigo-600 hover:text-indigo-700">
            ChordSheets
          </a>
          @if (auth.isLoggedIn()) {
            <div class="flex items-center gap-4">
              <span class="text-sm text-gray-600">{{ auth.user()?.displayName }}</span>
              <button (click)="auth.logout()"
                class="text-sm text-gray-500 hover:text-gray-700">
                Log out
              </button>
            </div>
          }
        </div>
      </header>

      <main class="flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
