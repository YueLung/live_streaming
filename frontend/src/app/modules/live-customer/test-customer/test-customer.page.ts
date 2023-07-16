import { Component } from '@angular/core';

@Component({
  selector: 'app-test-customer',
  templateUrl: './test-customer.page.html',
  styleUrls: ['./test-customer.page.less']
})
export class TestCustomerPage {
  roomName = 'test';

  isWatching = false;
}
