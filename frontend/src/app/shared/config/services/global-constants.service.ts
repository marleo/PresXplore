import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalConstantsService {
  constructor(private configService: ConfigService) {
    console.log('GlobalConstantsService created');
  }

  get clipServerURL(): string {
    const config = this.configService.getConfiguration();
    return `ws://${config.config_CLIP_SERVER_HOST}:${config.config_CLIP_SERVER_PORT}`;
  }

  get nodeServerURL(): string {
    const config = this.configService.getConfiguration();
    return `ws://${config.config_NODE_SERVER_HOST}:${config.config_NODE_SERVER_PORT}`;
  }

  get dataHost(): string {
    return this.configService.getConfiguration().config_DATA_BASE_URL;
  }

  get dataHostVideos(): string {
    return this.configService.getConfiguration().config_DATA_BASE_URL_VIDEOS;
  }

  get keyframeBaseURL(): string {
    return this.dataHost + 'keyframes/';
  }

  get thumbsBaseURL(): string {
    return this.dataHost + 'thumbs/';
  }

  get thumbsXLBaseURL(): string {
    return this.dataHost + 'thumbsXL/';
  }

  get summariesBaseURL(): string {
    return this.dataHost + 'summaries/';
  }

  get summariesXLBaseURL(): string {
    return this.dataHost + 'summariesXL/';
  }

  get videosBaseURL(): string {
    return this.dataHostVideos + 'videos/';
  }

  get summariesLargeBaseUrl(): string {
    return this.dataHost + 'summariesl/';
  }

  get resultsPerPage(): number {
    return this.configService.getConfiguration().config_RESULTS_PER_PAGE;
  }

  get maxResultsToReturn(): number {
    return this.configService.getConfiguration().config_MAX_RESULTS_TO_RETURN;
  }

  get imageWidth(): number {
    return this.configService.getConfiguration().config_IMAGE_WIDTH;
  }

  get showSubmittedFrames(): boolean {
    return this.configService.getConfiguration().config_SHOW_SUBMITTED_FRAMES;
  }
}

