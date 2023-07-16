import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveHostComponent } from './live-host.component';
import { ChatModule } from '../chat/chat.module';



@NgModule({
  declarations: [LiveHostComponent],
  exports: [LiveHostComponent],
  imports: [CommonModule, ChatModule]
})
export class SharedLiveHostModule { }
