import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LiveCustomerRoutingModule } from './live-customer-routing.module';
import { NiuniuCustomerPage } from './niuniu-customer/niuniu-customer.page';
import { SharedLiveCustomerModule } from 'src/app/shared/live-customer/shared-live-customer.module';


@NgModule({
  declarations: [
    NiuniuCustomerPage
  ],
  imports: [
    CommonModule,
    LiveCustomerRoutingModule,
    SharedLiveCustomerModule
  ]
})
export class LiveCustomerModule { }
