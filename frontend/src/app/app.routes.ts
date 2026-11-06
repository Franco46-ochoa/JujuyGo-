import { Routes } from '@angular/router';
import { HomePage } from './home/home';
import { LugarDetallePage } from './lugar-detalle/lugar-detalle';
import { TravesiaPage } from './travesia/travesia';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Yapa — Jujuy como se vive' },
  { path: 'lugares/:slug', component: LugarDetallePage, title: 'Lugar — Yapa' },
  { path: 'travesia', component: TravesiaPage, title: 'Armá tu travesía — Yapa' },
  { path: '**', redirectTo: '' },
];
