import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { MembershipPage } from './membership/membership.page';

const routes: Routes = [{
  path: '', component: LayoutComponent, children: [
    { path: '', redirectTo: 'membership', pathMatch: 'full' },
    { path: 'membership', component: MembershipPage },
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PosRoutingModule { }
