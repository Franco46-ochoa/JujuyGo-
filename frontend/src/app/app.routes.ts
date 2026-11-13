import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then(m => m.HomePage),
    title: 'Yapa — Jujuy como se vive',
  },
  {
    path: 'lugares/:slug',
    loadComponent: () => import('./lugar-detalle/lugar-detalle').then(m => m.LugarDetallePage),
    title: 'Lugar — Yapa',
  },
  {
    path: 'como-llegar',
    loadComponent: () => import('./como-llegar/como-llegar').then(m => m.ComoLlegarPage),
    title: 'Cómo llegar — Yapa',
  },
  {
    path: 'como-llegar/:slugLugar',
    loadComponent: () => import('./como-llegar/como-llegar').then(m => m.ComoLlegarPage),
    title: 'Cómo llegar — Yapa',
  },
  {
    path: 'travesia',
    loadComponent: () => import('./travesia/travesia').then(m => m.TravesiaPage),
    title: 'Armá tu travesía — Yapa',
  },
  { path: '**', redirectTo: '' },
];
