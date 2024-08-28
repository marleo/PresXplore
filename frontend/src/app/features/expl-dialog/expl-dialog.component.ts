import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'expl-dialog',
  templateUrl: './expl-dialog.component.html',
  styleUrls: ['./expl-dialog.component.scss']
})
export class ExplDialogComponent {
  @Input() title?: string;
  @Output() clickOnClose: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();
}