import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Notifications } from './components/notifications/notifications';
import { AnalysisComponent } from './components/analysis/analysis';
import { AddTransaction } from './components/add-transaction/add-transaction';
import { Categories } from './components/categories/categories';
import { Profile } from './components/profile/profile';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'notifications', component: Notifications },
  { path: 'analisis', component: AnalysisComponent },
  { path: 'add', component: AddTransaction },
  { path: 'categorias', component: Categories },
  { path: 'perfil', component: Profile }
];
