import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestHostPage } from './test-host/test-host.page';

const routes: Routes = [
  { path: '', redirectTo: 'test', pathMatch: 'full' },
  { path: 'test', component: TestHostPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiveHostRoutingModule { }
