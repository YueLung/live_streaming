import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveCustomerComponent } from './live-customer.component';



@NgModule({
  declarations: [LiveCustomerComponent],
  exports: [LiveCustomerComponent],
  imports: [CommonModule],
  providers: []
})
export class SharedLiveCustomerModule { }
