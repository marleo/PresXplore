import { Component, AfterViewInit } from '@angular/core';
import { WSServerStatus } from './shared/config/global-constants';
import { NodeServerConnectionService } from './services/nodeserver-connection/nodeserver-connection.service';
import { ClipServerConnectionService } from './services/clipserver-connection/clipserver-connection.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})


export class AppComponent implements AfterViewInit {

  constructor(
    public nodeService: NodeServerConnectionService,
    public clipService: ClipServerConnectionService,) {
    this.nodeService.messages.subscribe((msg: { content: any; }) => {
      if ('wsstatus' in msg) {
        console.log('node-notification: connected');
      } else {
        let result = msg.content;
        console.log("Response from node-server: " + result[0]);
        console.log(result[0]['shots']);
      }
    });
  }


  ngOnInit() {
  }

  ngAfterViewInit(): void {
  }

  /****************************************************************************
  * Queries
  ****************************************************************************/

  sendToNodeServer(msg: any) {
    let message = {
      source: 'appcomponent',
      content: msg
    };
    this.nodeService.messages.next(message);
  }


  /****************************************************************************
   * WebSockets (CLIP and Node.js)
   ****************************************************************************/

  checkNodeConnection() {
    if (this.nodeService.connectionState !== WSServerStatus.CONNECTED) {
      this.nodeService.connectToServer();
    }
  }

  checkCLIPConnection() {
    if (this.clipService.connectionState !== WSServerStatus.CONNECTED) {
      this.clipService.connectToServer();
    }
  }
}

