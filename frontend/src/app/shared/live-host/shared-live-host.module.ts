import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { LiveHostComponent } from './live-host.component';



@NgModule({
  declarations: [LiveHostComponent],
  exports: [LiveHostComponent],
  imports: [
    CommonModule,
    NzButtonModule
  ],
  providers: []
})
export class SharedLiveHostModule { }
