import { Routes } from '@angular/router';

/** Both pages are lazy-loaded: AG Grid only downloads when the table is opened. */
export const routes: Routes = [
  {
    path: '',
    title: 'Table · EU Data Explorer',
    loadComponent: () => import('./explorer/explorer.page').then((m) => m.ExplorerPage),
  },
  {
    path: 'compare',
    title: 'Compare · EU Data Explorer',
    loadComponent: () => import('./compare/compare.page').then((m) => m.ComparePage),
  },
  { path: '**', redirectTo: '' },
];
