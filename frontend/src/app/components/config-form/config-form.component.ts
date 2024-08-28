import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ConfigService } from '../../shared/config/services/config.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-config-form',
  templateUrl: './config-form.component.html',
  styleUrls: ['./config-form.component.scss']
})
export class ConfigFormComponent implements OnInit {
  configForm: FormGroup;
  @Output() closeForm = new EventEmitter<void>();

  constructor(private configService: ConfigService, private formBuilder: FormBuilder) {
    this.configForm = this.formBuilder.group({
      config_CLIP_SERVER_HOST: '',
      config_CLIP_SERVER_PORT: '',
      config_NODE_SERVER_HOST: '',
      config_NODE_SERVER_PORT: '',
      config_DATA_BASE_URL: '',
      config_DATA_BASE_URL_VIDEOS: '',
      config_RESULTS_PER_PAGE: 35,
      config_MAX_RESULTS_TO_RETURN: 1000,
      config_IMAGE_WIDTH: 236,
    });
  }

  ngOnInit(): void {
    const config = this.configService.getConfiguration();
    this.configForm.patchValue(config);
  }


  onSave() {
    this.configService.updateConfiguration(this.configForm.value);
    this.closeForm.emit();
  }
}
