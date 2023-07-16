import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'com-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.less']
})
export class ChatComponent {
  @Input() messageList: Array<string> = [];
  @Output() sendMessage = new EventEmitter();

  message = '';

  onSendMessage() {
    this.sendMessage.emit(this.message);
    this.message = '';
  }
}
