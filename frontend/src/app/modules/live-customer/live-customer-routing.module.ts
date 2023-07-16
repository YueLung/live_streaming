import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestCustomerPage } from './test-customer/test-customer.page';

const routes: Routes = [
  { path: '', redirectTo: 'test', pathMatch: 'full' },
  { path: 'test', component: TestCustomerPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiveCustomerRoutingModule { }
