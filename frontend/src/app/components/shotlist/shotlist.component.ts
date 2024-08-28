import { ViewChild, ElementRef, AfterViewInit, Component } from '@angular/core';
import { ViewChildren, QueryList } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NodeServerConnectionService } from '../../services/nodeserver-connection/nodeserver-connection.service';
import { ClipServerConnectionService } from '../../services/clipserver-connection/clipserver-connection.service';
import { formatAsTime, GlobalConstants, WSServerStatus } from '../../shared/config/global-constants';
import { Title } from '@angular/platform-browser';
import { MessageBarComponent } from '../message-bar/message-bar.component';
import { GlobalConstantsService } from '../../shared/config/services/global-constants.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-shotlist',
  templateUrl: './shotlist.component.html',
  styleUrls: ['./shotlist.component.scss']
})

export class ShotlistComponent implements AfterViewInit {
  videoid: string | undefined;
  framenumber: string | undefined;
  videoURL: SafeUrl = ''
  keyframes: Array<string> = [];
  timelabels: Array<string> = [];
  framenumbers: Array<string> = [];

  public statusTaskInfoText: string = "";
  statusTaskRemainingTime: string = "";

  imgWidth = this.globalConstants.imageWidth;
  imgHeight = this.globalConstants.imageWidth / GlobalConstants.imgRatio;

  keyframeBaseURL: string = '';
  videoBaseURL: string = '';
  datasetBase: string = '';
  fps = 0.0;
  vduration = 0;
  vtexts = [];
  vspeech: any | undefined;

  answerFieldHasFocus = false;
  showVideoBox = true;

  showButtons = -1;

  currentVideoTime: number = 0;
  @ViewChild('videoplayer') videoplayer!: ElementRef<HTMLVideoElement>;
  @ViewChild(MessageBarComponent) messageBar!: MessageBarComponent;
  @ViewChildren('queryResult') queryResults!: QueryList<ElementRef>;

  constructor(
    private sanitizer: DomSanitizer,
    public nodeService: NodeServerConnectionService,
    public clipService: ClipServerConnectionService,
    private titleService: Title,
    private route: ActivatedRoute,
    private globalConstants: GlobalConstantsService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(paraMap => {
      this.videoid = paraMap.get('id')?.toString();
      this.framenumber = paraMap.get('id2')?.toString();
      this.titleService.setTitle('v' + this.videoid);
      console.log(`slc: ${this.videoid} ${this.framenumber}`);
      this.keyframeBaseURL = this.globalConstants.thumbsBaseURL;
      this.videoBaseURL = this.globalConstants.videosBaseURL;
      this.datasetBase = 'keyframes';
    });

    //already connected?
    if (this.nodeService.connectionState == WSServerStatus.CONNECTED) {
      this.requestDataFromDB();
    }
    this.nodeService.messages.subscribe(msg => {
      if ('wsstatus' in msg) {
        this.requestDataFromDB();
      } else {
        let result = msg.content;
        this.loadVideoShots(result[0]);
      }
    });
  }

  ngAfterViewInit(): void {
    this.videoplayer.nativeElement.addEventListener('loadeddata', this.onVideoPlayerLoaded.bind(this));
    this.queryResults.changes.subscribe((list: QueryList<ElementRef>) => {
      this.scrollToSelectedQueryResult();
    });
  }

  scrollToSelectedQueryResult() {
    const selectedElement = this.queryResults.toArray().find(el => el.nativeElement.classList.contains('selectedqueryresult'));
    if (selectedElement) {
      const elementPosition = selectedElement.nativeElement.getBoundingClientRect().top + window.scrollY;
      const offset = 50; // Adjust this value as needed
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  }

  classifyVideoId(videoId: string) { //TODO: Check if this is the correct way to classify the videoId
    const patternFiveNumbers = /^\d{5}$/;
    const patternLHE = /^LHE\d{2}$/;
    const patternThreeUnderscores = /^[^\s_]+(_[^\s_]+){2}$/;

    if (patternFiveNumbers.test(videoId)) {
      return 'v3c';
    } else if (patternLHE.test(videoId)) {
      return 'lhe';
    } else if (patternThreeUnderscores.test(videoId)) {
      return 'mvk';
    } else {
      return 'esop';
    }
  }

  performFileSimilarityQuery(keyframe: string) {
    window.open('filesimilarity/' + encodeURIComponent(keyframe.replace('.jpg', GlobalConstants.replaceJPG_back2)) + '/esop/' + encodeURIComponent(this.datasetBase), '_blank'); //TODO: Don't hardcode the dataset ("esop")
  }

  onVideoPlayerLoaded() {
    console.log('video player loaded');
    if (this.framenumber) {
      this.gotoTimeOfFrame(parseInt(this.framenumber));
    }
  }

  getQueryResultCSSClass(frame: string) {
    if (this.framenumber && this.framenumber === frame) {
      return 'selectedqueryresult';
    } else {
      return 'queryresult';
    }
  }

  hasMetadata(): boolean {
    if (this.vduration !== 0) {
      return true;
    } else {
      return false;
    }
  }

  asTimeLabel(frame: string, withFrames: boolean = true) {
    return formatAsTime(frame, this.fps, withFrames);
  }

  requestDataFromDB() {
    console.log('slc: sending request to node-server');
    this.requestVideoShots(this.videoid!);
  }

  sendToNodeServer(msg: any) {
    let message = {
      source: 'appcomponent',
      content: msg
    };
    this.nodeService.messages.next(message);
  }

  requestVideoShots(videoid: string) {
    if (this.nodeService.connectionState === WSServerStatus.CONNECTED) {
      console.log('slc: get video info from database', videoid);
      let msg = {
        type: "videoinfo",
        videoid: videoid
      };
      this.sendToNodeServer(msg);
    } else {
      alert(`Node.js connection down: ${this.nodeService.connectionState}. Try reconnecting by pressing the red button!`);
    }
  }

  loadVideoShots(videoinfo: any) {
    console.log(videoinfo);
    let fps = parseFloat(videoinfo['fps']);
    this.fps = Math.round(fps * 100) / 100; //round to 2 decimal places
    if ('duration' in videoinfo) {
      let vduration = videoinfo['duration'];
      this.vduration = Math.round(vduration * 100) / 100;
      this.vtexts = videoinfo['texts'];
      this.vspeech = videoinfo['speech'];
    }
    this.keyframes = [];
    this.framenumbers = [];
    this.timelabels = [];

    for (let i = 0; i < videoinfo['shots'].length; i++) {
      let shotinfo = videoinfo['shots'][i];
      let kf = shotinfo['keyframe'];
      this.videoURL = this.sanitizeUrl(this.videoBaseURL + this.videoid + '.mp4');
      this.keyframes.push(`${this.videoid}/${kf}`);
      let comps = kf.replace('.jpg', '').split('_');
      let fnumber = comps[comps.length - 1];
      this.framenumbers.push(fnumber);
      this.timelabels.push(formatAsTime(fnumber, this.fps));
    }
  }

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

  hideVideoBox() {
    this.showVideoBox = false;
  }

  setCurrentTime(data: any) {
    this.currentVideoTime = data.target.currentTime * this.fps;
  }

  gotoTimeOfShot(idx: number) {
    this.showVideoBox = true;
    console.log(`goto time of shot ${idx} (fps=${this.fps})`);
    this.videoplayer.nativeElement.currentTime = parseFloat(this.framenumbers[idx]) / this.fps;
    if (this.videoplayer.nativeElement.paused) {
      this.videoplayer.nativeElement.play();
    }
  }

  gotoTimeOfFrame(frame: number) {
    console.log(`goto time of frame ${frame} (fps=${this.fps})`);
    this.videoplayer.nativeElement.currentTime = frame / this.fps;
  }

  onAnswerInputFocus() {
    this.answerFieldHasFocus = true;
  }

  onAnswerInputBlur() {
    this.answerFieldHasFocus = false
  }

  sanitizeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

}


