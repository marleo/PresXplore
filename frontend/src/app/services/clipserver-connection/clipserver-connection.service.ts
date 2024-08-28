import { Injectable } from '@angular/core';
import { WSServerStatus, GlobalConstants } from "../../shared/config/global-constants";
import { Observable, Observer } from 'rxjs';
import { AnonymousSubject } from 'rxjs/internal/Subject';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { GlobalConstantsService } from '../../shared/config/services/global-constants.service';

//const URL = GlobalConstants.clipServerURL;
let statusConnected = { 'wsstatus': 'connected' };

export interface Message {
  source: string;
  content: any;
}

@Injectable({
  providedIn: 'root'
})
export class ClipServerConnectionService {

  private subject: AnonymousSubject<MessageEvent> | undefined;
  public messages: Subject<Message>;

  public connectionState: WSServerStatus = WSServerStatus.UNSET;

  constructor(private globalConstants: GlobalConstantsService) {
    console.log('CLIPServerConnectionService created');
    this.messages = this.connectToServer();
  }

  public connectToServer() {
    this.messages = <Subject<Message>>this.connectToWebsocket(this.globalConstants.clipServerURL).pipe(
      map(
        (response: MessageEvent): Message => {
          let data = JSON.parse(response.data)
          return data;
        }
      )
    );
    return this.messages;
  }

  public connectToWebsocket(url: string): AnonymousSubject<MessageEvent> {
    if (!this.subject) {
      this.subject = this.create(url);
    }
    return this.subject;
  }

  private create(url: string): AnonymousSubject<MessageEvent> {
    let ws = new WebSocket(url);
    let observable = new Observable((obs: Observer<MessageEvent>) => {
      ws.onopen = (e) => {
        this.connectionState = WSServerStatus.CONNECTED;
        console.log("Connected to CLIP-server: " + url);
        let msg = { 'data': JSON.stringify(statusConnected) };
        obs.next(new MessageEvent('message', msg));
      }
      ws.onmessage = (msg) => {
        console.log('message from CLIP-server');
        obs.next(msg);
      };
      ws.onerror = (e) => {
        console.log('Error with CLIP-server');
        obs.error(obs);
      };
      ws.onclose = (e) => {
        console.log('Disconnected from CLIP-server');
        this.connectionState = WSServerStatus.DISCONNECTED;
        this.subject = undefined
        return obs.complete.bind(obs);
      };
      return ws.close.bind(ws);
    });
    let observer: Observer<MessageEvent> = {
      error: (err: any) => { },
      complete: () => { },
      next: (data: Object) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      }
    };
    return new AnonymousSubject<MessageEvent>(observer, observable);
  }
}
