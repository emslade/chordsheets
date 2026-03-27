import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'shared/:token',
    loadComponent: () => import('./features/sheets/shared-viewer/shared-viewer.component').then(m => m.SharedViewerComponent),
  },
  {
    path: 'sheets',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/sheets/sheet-list/sheet-list.component').then(m => m.SheetListComponent),
      },
      {
        path: 'new',
        loadComponent: () => import('./features/sheets/sheet-editor/sheet-editor.component').then(m => m.SheetEditorComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./features/sheets/sheet-editor/sheet-editor.component').then(m => m.SheetEditorComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./features/sheets/sheet-viewer/sheet-viewer.component').then(m => m.SheetViewerComponent),
      },
    ],
  },
  { path: '', redirectTo: 'sheets', pathMatch: 'full' },
  { path: '**', redirectTo: 'sheets' },
];
