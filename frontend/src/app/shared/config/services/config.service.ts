import { Injectable } from '@angular/core';
import { LocalConfig } from '../local-config';

const LOCALSTORAGE_FIELDNAME = 'diveXploreConfig';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: any;


  constructor() {
    this.loadConfig();
  }

  private loadConfig() { //Check all fields
    const localConfig = localStorage.getItem(LOCALSTORAGE_FIELDNAME);
    this.config = localConfig ? JSON.parse(localConfig) : this.getDefaultConfig();
    console.log('Loaded config:', this.config); // Debugging statement
  }


  private getDefaultConfig() {
    return {
      config_CLIP_SERVER_HOST: LocalConfig.config_CLIP_SERVER_HOST,
      config_CLIP_SERVER_PORT: LocalConfig.config_CLIP_SERVER_PORT,
      config_NODE_SERVER_HOST: LocalConfig.config_NODE_SERVER_HOST,
      config_NODE_SERVER_PORT: LocalConfig.config_NODE_SERVER_PORT,
      config_DATA_BASE_URL: LocalConfig.config_DATA_BASE_URL,
      config_DATA_BASE_URL_VIDEOS: LocalConfig.config_DATA_BASE_URL_VIDEOS,
      config_USER: LocalConfig.config_USER,
      config_PASS: LocalConfig.config_PASS,
      config_RESULTS_PER_PAGE: 35,
      config_MAX_RESULTS_TO_RETURN: 35 * 40,
      config_IMAGE_WIDTH: 236,
      config_SHOW_SUBMITTED_FRAMES: true,
      config_EXPLORE_RESULTS_PER_LOAD: 15,
      config_SHOTS_RESULTS_PER_LOAD: 40
      // ... add other default values
    };
  }

  getConfiguration() {
    return this.config;
  }

  updateConfiguration(newConfig: any) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(LOCALSTORAGE_FIELDNAME, JSON.stringify(this.config));
  }
}
