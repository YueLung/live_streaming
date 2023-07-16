import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzListModule } from 'ng-zorro-antd/list';
import { ChatComponent } from './chat.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';



@NgModule({
  declarations: [ChatComponent],
  exports: [ChatComponent],
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzListModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule
  ]
})
export class ChatModule { }
