import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AntZorroModule } from 'src/app/shared/ant-zorro.module';
import { SharedLiveHostModule } from 'src/app/shared/live-host/shared-live-host.module';
import { LiveHostRoutingModule } from './live-host-routing.module';
import { TestHostPage } from './test-host/test-host.page';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    TestHostPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    LiveHostRoutingModule,
    AntZorroModule,
    SharedLiveHostModule
  ]
})
export class LiveHostModule { }
