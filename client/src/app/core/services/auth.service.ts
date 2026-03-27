import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import type { AuthResponse, User, RegisterDto, LoginDto } from '@shared/types/index';

const TOKEN_KEY = 'chordsheets_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUser());

  constructor(private http: HttpClient, private router: Router) {
    const token = this.getToken();
    if (token) {
      this.loadUser();
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  register(dto: RegisterDto) {
    return this.http.post<AuthResponse>('/api/auth/register', dto).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);
        this.currentUser.set(res.user);
      })
    );
  }

  login(dto: LoginDto) {
    return this.http.post<AuthResponse>('/api/auth/login', dto).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);
        this.currentUser.set(res.user);
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private loadUser() {
    this.http.get<{ user: User }>('/api/auth/me').subscribe({
      next: res => this.currentUser.set(res.user),
      error: (err) => {
        // Only clear the token if the server explicitly rejected it (401).
        // Network errors or other failures shouldn't discard a potentially valid token.
        if (err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
        }
        this.currentUser.set(null);
      },
    });
  }
}
