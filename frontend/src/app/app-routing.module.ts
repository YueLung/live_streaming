import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'pos',
    loadChildren: () => import('./modules/pos/pos.module').then(m => m.PosModule)
  },
  {
    path: 'host',
    loadChildren: () => import('./modules/live-host/live-host.module').then(m => m.LiveHostModule)
  },
  {
    path: 'customer',
    loadChildren: () => import('./modules/live-customer/live-customer.module').then(m => m.LiveCustomerModule)
  }];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
