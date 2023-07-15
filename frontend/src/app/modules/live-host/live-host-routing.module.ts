import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NiuniuHostPage } from './niuniu-host/niuniu-host.page';

const routes: Routes = [
  { path: '001', component: NiuniuHostPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiveHostRoutingModule { }
