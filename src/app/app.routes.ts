import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'chat',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth.component').then((m) => m.AuthComponent),
    canActivate: [guestGuard],
    title: 'LiveChat - Acceder',
  },
  {
    path: 'chat',
    loadComponent: () => import('./features/chat/chat.component').then((m) => m.ChatComponent),
    canActivate: [authGuard],
    title: 'LiveChat',
  },
  {
    path: '**',
    redirectTo: 'chat',
  },
];
