import { Component } from '@angular/core';

@Component({
  selector: 'app-test-host',
  templateUrl: './test-host.page.html',
  styleUrls: ['./test-host.page.less']
})
export class TestHostPage {
  roomName = 'test';

  isHosting = false;
}
