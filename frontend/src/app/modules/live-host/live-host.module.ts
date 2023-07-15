import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LiveHostRoutingModule } from './live-host-routing.module';
import { NiuniuHostPage } from './niuniu-host/niuniu-host.page';
import { SharedLiveHostModule } from 'src/app/shared/live-host/shared-live-host.module';


@NgModule({
  declarations: [
    NiuniuHostPage
  ],
  imports: [
    CommonModule,
    LiveHostRoutingModule,
    SharedLiveHostModule
  ]
})
export class LiveHostModule { }
