import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NiuniuCustomerPage } from './niuniu-customer/niuniu-customer.page';

const routes: Routes = [
  { path: '001', component: NiuniuCustomerPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiveCustomerRoutingModule { }
