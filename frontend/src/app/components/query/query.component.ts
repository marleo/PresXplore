import { ViewChild, ElementRef, Component, AfterViewInit, Renderer2 } from '@angular/core';
import { HostListener } from '@angular/core';
import { GlobalConstants, WSServerStatus, formatAsTime, QueryType, getTimestampInSeconds } from '../../shared/config/global-constants';
import { GlobalConstantsService } from '../../shared/config/services/global-constants.service';
import { NodeServerConnectionService } from '../../services/nodeserver-connection/nodeserver-connection.service';
import { ClipServerConnectionService } from '../../services/clipserver-connection/clipserver-connection.service';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MessageBarComponent } from '../message-bar/message-bar.component';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { UrlRetrievalService } from 'src/app/services/url-retrieval/url-retrieval.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface Shot {
  keyframe: string;
}

@Component({
  selector: 'app-query',
  templateUrl: './query.component.html',
  styleUrls: ['./query.component.scss']
})
export class QueryComponent implements AfterViewInit {
  // Component's core properties
  @ViewChild('inputfield') inputfield!: ElementRef<HTMLInputElement>;
  @ViewChild('videopreview', { static: false }) videopreview!: ElementRef;
  @ViewChild(MessageBarComponent) messageBar!: MessageBarComponent;
  @ViewChild('scrollableContainer') scrollableContainer!: ElementRef<HTMLDivElement>;

  // Subscriptions for handling events
  private urlRetrievalServiceSubscription!: Subscription;

  // Query-related properties
  queryinput: string = '';
  queryresults: Array<string> = [];
  queryresult_resultnumber: Array<string> = [];
  queryresult_videoid: Array<string> = [];
  queryresult_frame: Array<string> = [];
  queryresult_videopreview: Array<string> = [];
  queryTimestamp: number = 0;
  queryType: string = '';
  previousQuery: any | undefined;
  querydataset: string = '';


  // Metadata and summaries for video analysis
  metadata: any;
  summaries: Array<string> = [];
  selectedSummaryIdx = 0;

  // Video playback and preview properties
  videoSummaryPreview: string = '';
  videoLargePreview: SafeUrl = '';
  videoPlayPreview: SafeUrl = '';
  videoExplorePreview: Array<string> = [];
  shotPreview: Array<string> = [];
  currentContent: 'image' | 'video' = 'image';

  // UI state and navigation properties
  selectedItem = 0;
  showPreview = false;
  showHelpActive = false;
  showHistoryActive = false;
  thumbSize = 'small';
  selectedHistoryEntry: string | undefined;
  queryFieldHasFocus = false;
  answerFieldHasFocus = false;
  showButtons = -1;
  activeButton: string = 'image';
  showConfigForm = false;

  //Toast
  showToast: boolean = false;
  toastMessage: string = "";
  toastLink: string = "";
  toastImageSrc: string | null = null;

  // Dataset and query configuration
  selectedDataset = 'esop';
  datasets = [
    { id: 'esop', name: 'ESOP' }
  ];
  selectedQueryType = 'ocr-text';
  private queryTypes = [
    { id: 'ocr-text', name: 'OCR-Text' },
    { id: 'speech', name: 'Speech' },
    { id: 'videoid', name: 'VideoId' }
  ];
  selectedVideoFiltering = 'all';
  videoFiltering = [
    { id: 'all', name: 'All/v' },
    { id: 'first', name: 'First/v' }
  ];

  // Results and pagination
  totalReturnedResults = 0;
  selectedPage = '1';
  pages = ['1']

  // Helper properties for file similarity and node server info
  file_sim_keyframe: string | undefined
  file_sim_pathPrefix: string | undefined
  file_sim_page: string = "1"
  nodeServerInfo: string | undefined;

  // Display ratios and base URLs
  imgWidth = this.globalConstants.imageWidth;
  imgHeight = this.globalConstants.imageWidth / GlobalConstants.imgRatio;
  queryBaseURL = this.getBaseURL();
  keyframeBaseURL: string = '';
  datasetBase: string = 'keyframes';

  // FPS mapping for video frames
  queryresult_fps = new Map<string, number>();

  // Mapping for different query types based on the selected dataset
  private queryTypeMap: Map<string, typeof this.queryTypes>;

  // Task information properties
  public statusTaskInfoText: string = "";
  statusTaskRemainingTime: string = "";

  constructor(
    private sanitizer: DomSanitizer,
    private globalConstants: GlobalConstantsService,
    public nodeService: NodeServerConnectionService,
    public clipService: ClipServerConnectionService,
    public urlRetrievalService: UrlRetrievalService,
    private renderer: Renderer2,
    private titleService: Title,
    private route: ActivatedRoute,
    public dialog: MatDialog) {
    this.queryTypeMap = new Map<string, typeof this.queryTypes>();
    this.initializeMap();
  }

  ngOnInit() {
    this.urlRetrievalServiceSubscription = this.urlRetrievalService.explorationResults$.subscribe(results => {
      if (results) {
        this.videoExplorePreview = results;
      }
    });

    this.route.paramMap.subscribe(paraMap => {
      this.file_sim_keyframe = paraMap.get('id')?.toString();
      if (this.file_sim_keyframe) {
        console.log(`qc: ${this.file_sim_keyframe}`);
        this.titleService.setTitle(this.file_sim_keyframe.substring(this.file_sim_keyframe.indexOf('/') + 1));
      }
      let sds = paraMap.get('id2')?.toString();
      if (sds !== undefined) {
        this.selectedDataset = sds;
      }
      this.file_sim_pathPrefix = paraMap.get('id3')?.toString();
      if (this.file_sim_pathPrefix) {
        console.log(`qc: ${this.file_sim_pathPrefix}`);
      }
      if (paraMap.get('page')) {
        this.file_sim_page = paraMap.get('page')!.toString();
        this.selectedPage = this.file_sim_page;
      }
    });

    if (this.nodeService.connectionState == WSServerStatus.CONNECTED) {
      console.log('qc: node-service already connected');
    } else {
      console.log('qc: node-service not connected yet');
    }
    if (this.clipService.connectionState == WSServerStatus.CONNECTED) {
      console.log('qc: CLIP-service already connected');
      if (this.file_sim_keyframe && this.file_sim_pathPrefix) {
        this.sendFileSimilarityQuery(this.file_sim_keyframe, this.file_sim_pathPrefix);
      } else {
        this.performHistoryLastQuery();
      }
    } else {
      console.log('qc: CLIP-service not connected yet');
    }

    this.nodeService.messages.subscribe(msg => {
      this.nodeServerInfo = undefined;

      if ('wsstatus' in msg) {
        console.log('qc: node-notification: connected');
      } else {
        let m = JSON.parse(JSON.stringify(msg));
        if ("videoid" in msg) {
          this.queryresult_fps.set(m.videoid, m.fps);
        } else {
          if ("scores" in msg || m.type === 'ocr-text') {
            this.handleQueryResponseMessage(msg);
          } else {
            if ("type" in msg) {
              if (m.type == 'metadata') {
                this.metadata = m.results[0];
                if (this.metadata?.location) {
                }
              } else if (m.type === 'info') {
                this.nodeServerInfo = m.message;
              } else if (m.type === 'videoinfo') {
                const keyframes: Array<string> = m.content[0].shots.map((shot: Shot) => shot.keyframe);
                const updatedResults = keyframes.map(keyframe => this.globalConstants.thumbsBaseURL + '/' + this.queryresult_videoid[this.selectedItem] + "/" + keyframe);
                this.shotPreview = updatedResults;
              }
            } else {
              this.handleQueryResponseMessage(msg);
            }
          }
        }
      }
    });

    this.clipService.messages.subscribe(msg => {
      if ('wsstatus' in msg) {
        console.log('qc: CLIP-notification: connected');
        if (this.file_sim_keyframe && this.file_sim_pathPrefix) {
          this.sendFileSimilarityQuery(this.file_sim_keyframe, this.file_sim_pathPrefix);
        }
      } else {
        console.log("qc: response from clip-server: " + msg);
        this.handleQueryResponseMessage(msg);
      }
    });
  }

  ngOnDestroy() {
    this.urlRetrievalServiceSubscription.unsubscribe();
  }

  ngAfterViewInit(): void {
  }

  ngAfterViewChecked(): void {
    if (this.videopreview && this.currentContent === 'video') {
      this.playVideoAtFrame();
    }
  }

  handleToastClose() {
    this.showToast = false;
  }

  playVideoAtFrame(): void { //Start video preview at the selected frame
    this.getFPSForItem(this.selectedItem);

    let frame = parseFloat(this.queryresult_frame[this.selectedItem]);
    let fps = this.queryresult_fps.get(this.queryresult_videoid[this.selectedItem])!;
    let time = frame / fps;

    const videoElement = this.videopreview.nativeElement;

    if (!Number.isNaN(time) && !(videoElement.currentTime > 0)) {
      console.log("Resetting...")
      this.renderer.setProperty(videoElement, 'currentTime', time);
      this.renderer.listen(videoElement, 'loadedmetadata', () => {
        videoElement.play();
      });
    }
  }

  private initializeMap(): void {
    const filteredQueryTypesEsop = this.queryTypes.filter(qt => !['textquery', 'metadata'].includes(qt.id));
    this.queryTypeMap.set('esop', filteredQueryTypesEsop);
  }

  public getQueryTypes(key: string): typeof this.queryTypes {
    return this.queryTypeMap.get(key) || [];
  }

  toggleConfigDialog(): void {
    this.showConfigForm = !this.showConfigForm;
  }

  private displayVideoSummary() {
    let videoId = this.queryresult_videoid[this.selectedItem];
    let frame = this.queryresult_frame[this.selectedItem];
    this.videoLargePreview = this.sanitizeUrl(this.urlRetrievalService.getThumbnailUrl(videoId, frame));
    this.videoPlayPreview = this.sanitizeUrl(this.urlRetrievalService.getVideoUrl(videoId));
  }

  reloadComponent(): void {
    window.location.href = window.location.origin;
  }

  showHelp() {
    this.showHelpActive = !this.showHelpActive;
  }

  showHistory() {
    this.showHistoryActive = !this.showHistoryActive;
  }

  toggleConfigModal() {
    this.showConfigForm = !this.showConfigForm;
  }

  saveToHistory(msg: QueryType) {
    if (msg.query === '') {
      return;
    }

    let hist = localStorage.getItem('history')
    if (hist) {
      let queryHistory: Array<QueryType> = JSON.parse(hist);
      let containedPos = -1;
      let i = 0;
      for (let qh of queryHistory) {
        if (qh.query === msg.query && qh.dataset === msg.dataset) {
          containedPos = i;
          break;
        }
        i++;
      }
      if (containedPos >= 0) {
        queryHistory.splice(containedPos, 1);
        queryHistory.unshift(msg);
        localStorage.setItem('history', JSON.stringify(queryHistory));
      }
      else {
        queryHistory.unshift(msg);
        localStorage.setItem('history', JSON.stringify(queryHistory));
      }
    } else {
      let queryHistory: Array<QueryType> = [msg];
      localStorage.setItem('history', JSON.stringify(queryHistory));
    }
  }

  newTab(): void {
    const currentUrl = window.location.href;
    window.open(currentUrl, '_blank');
  }

  @HostListener('document:keyup', ['$event'])
  handleKeyboardEventUp(event: KeyboardEvent) {
    if (!this.queryFieldHasFocus && !this.answerFieldHasFocus && !this.showConfigForm && !this.showHistoryActive) {
      switch (event.key) {
        case 'q':
          this.inputfield.nativeElement.select();
          break;
        case 'e':
          this.inputfield.nativeElement.focus();
          break;
        case 'Escape':
          this.closeVideoPreview();
          break;
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.queryFieldHasFocus && !this.answerFieldHasFocus && !this.showConfigForm && !this.showHistoryActive) {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowLeft':
          this.handleArrowKeys(event);
          break;
        default:
          if (this.isNumericKey(event.key) && !this.showPreview) {
            this.gotoPage(event.key);
          } else if (this.isNumericKey(event.key) && this.showPreview) {
            switch (event.key) {
              case '1':
                this.setContent('image');
                break;
              case '2':
                this.setContent('video');
                break;
              case '0':
                this.showVideoShots(this.queryresult_videoid[this.selectedItem], this.queryresult_frame[this.selectedItem])
                break;
            }
          }
          break;
      }
      event.preventDefault();
    }
  }

  private handleArrowKeys(event: KeyboardEvent) {
    const { key, shiftKey } = event;
    if (shiftKey) {
      if (!this.showPreview) {
        key === 'ArrowRight' ? this.nextPage() : this.prevPage();
      }
    } else {
      let toShow = this.showPreview;
      if (key === 'ArrowRight') {
        this.selectedItem = this.selectedItem < this.queryresult_videoid.length - 1 ? this.selectedItem + 1 : !this.showPreview ? 0 : this.selectedItem;
      } else {
        this.selectedItem = this.selectedItem > 0 ? this.selectedItem - 1 : !this.showPreview ? this.queryresult_videoid.length - 1 : this.selectedItem;
      }
      if (toShow) {
        this.showVideoPreview();
      }
    }
  }

  private isNumericKey(key: string): boolean {
    return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key);
  }

  prevPage() {
    let currPage = parseInt(this.selectedPage);
    if (currPage > 1) {
      this.selectedPage = (currPage - 1).toString();
      this.performQuery();
    }
  }

  nextPage() {
    let currPage = parseInt(this.selectedPage);
    if (currPage < this.pages.length) {
      this.selectedPage = (currPage + 1).toString();
      this.performQuery();
    }
  }

  gotoPage(pnum: string) {
    let testPage = parseInt(pnum);
    if (testPage < this.pages.length && testPage > 0) {
      this.selectedPage = pnum;
      this.performQuery();
    }
  }

  getBaseURLFromKey(selDat: string) {
    return this.globalConstants.thumbsBaseURL;
  }

  getBaseURL() {
    return this.getBaseURLFromKey(this.selectedDataset);
  }

  isVideoResult(dataset: string): boolean {
    return dataset.endsWith('v');
  }

  getIDPartNums() {
    if (this.selectedDataset == 'marine-v' || this.selectedDataset == 'marine-s') {
      return 3;
    }
    else {
      return 1;
    }
  }

  onQueryInputFocus() {
    this.queryFieldHasFocus = true;
  }

  onQueryInputBlur() {
    this.queryFieldHasFocus = false;
  }

  handleAnswerFieldFocusChange(hasFocus: boolean) {
    this.answerFieldHasFocus = hasFocus;
  }

  selectItemAndShowSummary(idx: number, event: MouseEvent) {
    this.selectedItem = idx;
    this.showPreview = true;
    this.showVideoPreview();
    this.adjustVideoPreviewPosition(event);
  }

  adjustVideoPreviewPosition(event: MouseEvent) {
    const previewElement = document.querySelector('.videopreview') as HTMLElement;
    if (previewElement) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();

      previewElement.style.left = `${rect.left}px`;
      previewElement.style.top = `${rect.top + window.scrollY}px`;
      previewElement.style.display = 'block';
    }
  }

  showVideoPreview() {
    this.displayVideoSummary();
    this.requestVideoSummaries(this.queryresult_videoid[this.selectedItem]);
  }

  closeVideoPreview() {
    this.showPreview = false;
    this.selectedSummaryIdx = 0;
    this.videoSummaryPreview = '';
    this.videoLargePreview = '';
    this.videoPlayPreview = '';
    this.videoExplorePreview = [];
  }

  setContent(content: 'image' | 'video') {
    this.currentContent = content;
    this.activeButton = content;
    this.showVideoPreview();
  }

  loadExploreImages(videoid: string) {
    let msg = {
      dataset: 'v3c',
      type: "clusterimage",
      query: videoid,
      clientId: "direct"
    };

    console.log('ec: queryClusterForImages: ' + videoid);

    if (this.nodeService.connectionState == WSServerStatus.CONNECTED) {
      console.log("ec: sent message to node-server: " + msg);
      let message = {
        source: 'appcomponent',
        content: msg
      };
      this.nodeService.messages.next(message);
    }
  }

  loadShotList(videoid: string) {
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

  exploreToShotlist(explorationUrl: string) {
    let videoId: string = "";
    const url = new URL(explorationUrl);
    const paths = url.pathname.split('/');
    const summariesXLIndex = paths.indexOf('summaries');
    if (summariesXLIndex !== -1 && summariesXLIndex + 1 < paths.length) {
      videoId = paths[summariesXLIndex + 2];
    }
    console.log("Browsing to: " + videoId)
    this.showVideoShots(videoId, '1');
  }

  shotPreviewToShotList(previewurl: string) {
    console.log("Here!")
    const url = new URL(previewurl);
    const paths = url.pathname.split('/');
    const [videoid, frame_with_extension] = paths[paths.length - 1].split('_');
    const frame_number = frame_with_extension.split('.')[0];

    this.showVideoShots(videoid, frame_number);
  }

  showVideoShots(videoid: string, frame: string) {
    window.open('video/' + videoid + '/' + frame, '_blank');
  }

  mouseOverShot(i: number) {
    this.showButtons = i;
    this.getFPSForItem(i);
  }

  mouseLeaveShot(i: number) {
    this.showButtons = -1;
  }

  getFPSForItem(i: number) {
    if (this.queryresult_fps.get(this.queryresult_videoid[i]) == undefined) {
      let msg = {
        type: "videofps",
        synchronous: false,
        videoid: this.queryresult_videoid[i]
      };
      this.sendToNodeServer(msg);
    }
  }

  getTimeInformationFor(i: number) {
    let fps = this.queryresult_fps.get(this.queryresult_videoid[i]);
    if (fps !== undefined) {
      let sTime = formatAsTime(this.queryresult_frame[i], fps, false);
      return sTime;
    } else {
      return '';
    }
  }

  resetPageAndPerformQuery() {
    this.selectedPage = '1';
    this.performTextQuery();
  }

  resetQuery() {
    this.queryinput = '';
    this.inputfield.nativeElement.focus();
    this.inputfield.nativeElement.select();
    this.file_sim_keyframe = undefined
    this.file_sim_pathPrefix = undefined
    this.previousQuery = undefined
    this.selectedPage = '1';
    this.selectedDataset = 'esop';
    this.selectedVideoFiltering = 'all';
    this.pages = ['1'];
    this.clearResultArrays();

    let message = {
      type: 'resetsubmission'
    }
    this.sendToNodeServer(message);

    let queryHistory: Array<QueryType> = [];
    localStorage.setItem('history', JSON.stringify(queryHistory));
  }


  private clearResultArrays() {
    this.queryresults = [];
    this.queryresult_resultnumber = [];
    this.queryresult_videoid = [];
    this.queryresult_frame = [];
    this.queryresult_videopreview = [];
    this.queryTimestamp = 0;
  }

  /****************************************************************************
  * Queries
  ****************************************************************************/

  queryForVideo(i: number) {
    let v = this.queryresult_videoid[i];
    console.log('query for video ' + v);
    this.queryinput = v;
    this.selectedQueryType = 'videoid';
    this.performQuery();
  }

  performNewTextQuery() {
    this.selectedPage = '1';
    this.previousQuery = undefined;
    this.file_sim_keyframe = undefined;
    this.file_sim_pathPrefix = undefined;
    this.performQuery();
  }

  performQuery(saveToHist: boolean = true) {
    if (this.file_sim_keyframe && this.file_sim_pathPrefix) {
      this.performFileSimilarityQuery(this.file_sim_keyframe, this.selectedPage);
    }
    else if (this.previousQuery !== undefined && this.previousQuery.type === "similarityquery") {
      this.performSimilarityQuery(parseInt(this.previousQuery.query));
    } else {
      this.performTextQuery(saveToHist);
    }
  }

  performTextQuery(saveToHist: boolean = true) {

    let qi = this.queryinput.trim();
    if (qi === '') {
      return;
    }

    if (qi == '*' && this.selectedQueryType !== 'videoid' || qi == '*' && this.selectedVideoFiltering !== 'first') {
      this.messageBar.showErrorMessage('* queries work only for VideoId and Video Filter (First/v)');
      return;
    }

    let querySubmission = this.queryinput;

    this.showHelpActive = false;
    this.showHistoryActive = false;
    this.showPreview = false;

    if (this.clipService.connectionState === WSServerStatus.CONNECTED ||
      this.nodeService.connectionState === WSServerStatus.CONNECTED) {

      this.nodeServerInfo = "processing query, please wait...";

      if (this.previousQuery !== undefined && this.previousQuery.type === 'textquery' && this.previousQuery.query !== this.queryinput) {
        this.selectedPage = '1';
      }

      console.log('qc: query for', querySubmission + " videofiltering=" + this.selectedVideoFiltering + " and " + this.queryType);
      this.queryBaseURL = this.getBaseURL();
      let msg = {
        type: "textquery",
        clientId: "direct",
        query: querySubmission,
        maxresults: this.globalConstants.maxResultsToReturn,
        resultsperpage: this.globalConstants.resultsPerPage,
        selectedpage: this.selectedPage,
        dataset: this.selectedDataset,
        videofiltering: this.selectedVideoFiltering
      };
      this.previousQuery = msg;

      msg.dataset = this.selectedDataset;
      msg.type = this.selectedQueryType;
      msg.videofiltering = this.selectedVideoFiltering;

      this.queryTimestamp = getTimestampInSeconds();

      if (this.nodeService.connectionState === WSServerStatus.CONNECTED) {
        this.queryType = 'database/joint';
        console.log('qc: send to node-server: ' + msg);
        this.sendToNodeServer(msg);
      } else {
        this.queryType = 'CLIP';
        this.sendToCLIPServer(msg);
      }

      if (saveToHist) {
        this.saveToHistory(msg);
      }
    } else {
      alert(`CLIP connection down: ${this.clipService.connectionState}. Try reconnecting by pressing the red button!`);
    }
  }

  performSimilarityQuery(serveridx: number) {
    if (this.nodeService.connectionState === WSServerStatus.CONNECTED) {
      console.log('similarity-query for ', serveridx);
      this.queryBaseURL = this.getBaseURL();
      let msg = {
        type: "similarityquery",
        query: serveridx.toString(),
        videofiltering: this.selectedVideoFiltering,
        maxresults: this.globalConstants.maxResultsToReturn,
        resultsperpage: this.globalConstants.resultsPerPage,
        selectedpage: this.selectedPage,
        dataset: this.selectedDataset
      };
      this.previousQuery = msg;

      this.sendToNodeServer(msg);
      this.saveToHistory(msg);
    }
  }

  performFileSimilarityQuery(keyframe: string, selectedPage: string = "1") {
    console.log('file-similarity-query for ', keyframe);

    let filename = keyframe.split('_');
    let videoid = filename.slice(0, filename.length - 1).join('_');
    let parts = filename[filename.length - 1];
    let framenumber = parts.split('.')[0];

    let target = '_blank';
    if (this.file_sim_keyframe === keyframe) {
      target = '_self';
    }
    window.open('filesimilarity/' + encodeURIComponent(keyframe.replace('.jpg', GlobalConstants.replaceJPG_back2)) + '/' + this.selectedDataset + '/' + encodeURIComponent(videoid) + '/' + selectedPage, target);
  }

  sendFileSimilarityQuery(keyframe: string, pathprefix: string) {
    if (this.nodeService.connectionState === WSServerStatus.CONNECTED) {

      console.log('file-similarity-query for ', keyframe);
      let msg = {
        type: "file-similarityquery",
        query: keyframe,
        videofiltering: this.selectedVideoFiltering,
        pathprefix: pathprefix,
        maxresults: this.globalConstants.maxResultsToReturn,
        resultsperpage: this.globalConstants.resultsPerPage,
        selectedpage: this.file_sim_page,
        dataset: this.selectedDataset
      };
      this.previousQuery = msg;

      this.sendToNodeServer(msg);
      this.saveToHistory(msg);
    }
  }

  performHistoryQuery(hist: QueryType): void {
    this.queryinput = hist.query;
    this.selectedDataset = hist.dataset;
    this.selectedQueryType = hist.type;
    this.selectedVideoFiltering = hist.videofiltering;
    this.selectedPage = hist.selectedpage;
    this.previousQuery = undefined;
    this.file_sim_keyframe = undefined;
    this.file_sim_pathPrefix = undefined;
    this.performQuery(false);
  }

  performHistoryLastQuery() {
    let hist = localStorage.getItem('history')
    if (hist) {
      let queryHistory: Array<QueryType> = JSON.parse(hist);
      let msg: QueryType = queryHistory[0];
      if (msg.type === 'textquery') {
        this.queryinput = msg.query;
        this.selectedDataset = msg.dataset;
        this.selectedPage = msg.selectedpage;
      }

      this.sendToCLIPServer(msg);
    }
  }

  requestVideoSummaries(videoid: string) {
    if (this.nodeService.connectionState === WSServerStatus.CONNECTED) {
      let msg = {
        type: "videosummaries",
        videoid: videoid
      };
      this.sendToNodeServer(msg);
    } else {
      alert(`Node.js connection down: ${this.nodeService.connectionState}. Try reconnecting by pressing the red button!`);
    }
  }

  sendToCLIPServer(msg: any) {
    let message = {
      source: 'appcomponent',
      content: msg
    };
    this.clipService.messages.next(message);
    this.queryTimestamp = getTimestampInSeconds();
  }

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
  handleQueryResponseMessage(qresults: any) {
    if (qresults.totalresults === 0) {
      this.nodeServerInfo = 'The query returned 0 results!';
    }

    this.totalReturnedResults = qresults.totalresults; //totally existing results

    //create pages array
    this.pages = [];
    if (qresults.totalresults < this.globalConstants.resultsPerPage || qresults.type === 'videoid' || qresults.type === 'metadata') {
      console.log("total results: " + this.totalReturnedResults + " results per page: " + this.globalConstants.resultsPerPage + " pages: " + this.totalReturnedResults / this.globalConstants.resultsPerPage)
      this.pages.push('1');
    } else {
      console.log("total results: " + this.totalReturnedResults + " results per page: " + this.globalConstants.resultsPerPage + " pages: " + this.totalReturnedResults / this.globalConstants.resultsPerPage)
      for (let i = 1; i <= Math.ceil(this.totalReturnedResults / this.globalConstants.resultsPerPage); i++) {
        this.pages.push(i.toString());
        console.log("Pages: " + i)
      }
    }
    //populate images
    this.clearResultArrays();

    let resultnum = (parseInt(this.selectedPage) - 1) * this.globalConstants.resultsPerPage + 1;
    this.querydataset = qresults.dataset;
    this.keyframeBaseURL = this.getBaseURLFromKey(qresults.dataset);

    console.log("qc: handleQueryResponseMessage: " + qresults.results.length + " results");
    console.log("keyframeBaseURL: " + this.keyframeBaseURL);

    for (let i = 0; i < qresults.results.length; i++) { //TODO: Changed to accomodate only esop videos
      let e = qresults.results[i].replace('.png', GlobalConstants.replacePNG2);
      let filename = e.split('_');
      let videoid = filename.slice(0, filename.length - 1).join('_');
      let parts = filename[filename.length - 1];
      let framenumber = parts.split('.')[0];

      console.log("qc: handleQueryResponseMessage: " + e + " " + videoid + " " + framenumber + " - " + filename);

      this.queryresults.push(e);
      this.queryresult_videoid.push(videoid);
      this.queryresult_frame.push(framenumber);
      this.queryresult_resultnumber.push(resultnum.toString());
      this.queryresult_videopreview.push('');
    }

    this.inputfield.nativeElement.blur();
    this.nodeServerInfo = undefined;
  }

  closeWebSocketCLIP() {
    if (this.clipService.connectionState !== WSServerStatus.CONNECTED) {
      this.clipService.connectToServer();
    }
  }

  get displayQueryResult() {
    return this.queryresults;
  }

  queryResultVideoId(item: number) {
    let fullid = this.queryresult_videoid[item];
    let parts = fullid.split('_');
    let videoid = parts.slice(0, parts.length).join('_');
    return videoid;
  }

  constructedUrl(index: number, item: any): SafeUrl { //TODO: break loop?
    const videoId = this.queryResultVideoId(index);
    const url = `${this.keyframeBaseURL}/${videoId}/${item}`;
    return this.sanitizeUrl(url);
  }

  sanitizeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}
