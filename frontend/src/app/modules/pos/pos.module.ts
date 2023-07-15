import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PosRoutingModule } from './pos-routing.module';
import { LayoutComponent } from './layout/layout.component';
import { MembershipPage } from './membership/membership.page';


@NgModule({
  declarations: [
    LayoutComponent,
    MembershipPage
  ],
  imports: [
    CommonModule,
    PosRoutingModule
  ]
})
export class PosModule { }
