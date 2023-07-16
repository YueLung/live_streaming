import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveCustomerComponent } from './live-customer.component';
import { ChatModule } from '../chat/chat.module';



@NgModule({
  declarations: [LiveCustomerComponent],
  exports: [LiveCustomerComponent],
  imports: [CommonModule, ChatModule]
})
export class SharedLiveCustomerModule { }
