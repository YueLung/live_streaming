import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AntZorroModule } from 'src/app/shared/ant-zorro.module';
import { SharedLiveCustomerModule } from 'src/app/shared/live-customer/shared-live-customer.module';
import { LiveCustomerRoutingModule } from './live-customer-routing.module';
import { TestCustomerPage } from './test-customer/test-customer.page';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    TestCustomerPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    LiveCustomerRoutingModule,
    AntZorroModule,
    SharedLiveCustomerModule
  ]
})
export class LiveCustomerModule { }
