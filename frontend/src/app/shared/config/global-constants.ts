import { LocalConfig } from "./local-config";

export enum WebSocketEvent {
  UNSET = 'unset',
  CLOSE = 'disconnected',
  OPEN = 'connected',
  SEND = 'sending',
  MESSAGE = 'message',
  ERROR = 'error'
}

export enum WSServerStatus {
  UNSET = 'unset',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}

export interface QueryType {
  type: string;
  query: string;
  videofiltering: string;
  maxresults: number;
  resultsperpage: number;
  selectedpage: string;
  dataset: string;
}

export class GlobalConstants {
  public static replacePNG2 = '.jpg';
  public static replaceJPG_back2 = '.jpg';

  public static imgRatio = 320.0 / 180.0;
}

export function twoDigits(str: string): string {
  if (str.length < 2) {
    return `0${str}`;
  } else {
    return str;
  }
}

export function formatAsTime(frame: string, fps: number, withFrames: boolean = true) {
  let ff = Math.floor(parseInt(frame) % fps);
  let secs = parseInt(frame) / fps;
  let ss = Math.floor(secs % 60);
  let mm = Math.floor(secs / 60);
  let hh = Math.floor(secs / 3600);
  let timeString = `${twoDigits(hh.toString())}:${twoDigits(mm.toString())}:${twoDigits(ss.toString())}`;
  if (withFrames) {
    return `${timeString}.${twoDigits(ff.toString())}`
  } else {
    return timeString;
  }
}

export function getTimestampInSeconds() {
  return Math.floor(Date.now() / 1000)
}