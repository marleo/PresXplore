import { Component, EventEmitter, Output } from '@angular/core';
import { NodeServerConnectionService } from '../../services/nodeserver-connection/nodeserver-connection.service';
import { ClipServerConnectionService } from '../../services/clipserver-connection/clipserver-connection.service';

@Component({
  selector: 'app-status-bar',
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.scss']
})
export class StatusBarComponent {
  @Output() answerFieldFocusChange = new EventEmitter<boolean>();

  statusTaskRemainingTime: string = '';
  statusTaskInfoText: string = '';
  topicanswer: string = '';
  answerFieldHasFocus = false;

  constructor(
    public nodeService: NodeServerConnectionService,
    public clipService: ClipServerConnectionService) {
  }

  sendToNodeServer(msg: any) {
    console.log("Sending to node server: " + JSON.stringify(msg));
    let message = {
      source: 'appcomponent',
      content: msg
    };
    this.nodeService.messages.next(message);
  }
}
