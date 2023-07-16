import { NgModule } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';



@NgModule({
  exports: [
    NzButtonModule,
    NzInputModule,
    NzModalModule
  ]
})
export class AntZorroModule { }
