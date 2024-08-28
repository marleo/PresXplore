import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatSliderModule } from '@angular/material/slider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { ShotlistComponent } from './components/shotlist/shotlist.component';
import { ApiModule, Configuration } from 'openapi/dres';
import { GlobalConstants } from './shared/config/global-constants';
import { HttpClientModule } from '@angular/common/http';
import { QueryComponent } from './components/query/query.component';

import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MessageBarComponent } from './components/message-bar/message-bar.component';
import { ConfigFormComponent } from './components/config-form/config-form.component';

import { MatDialogModule } from '@angular/material/dialog';
import { HelpSectionComponent } from './dialogues/help-section/help-section.component';
import { ExplDialogComponent } from './features/expl-dialog/expl-dialog.component';
import { StatusBarComponent } from './components/status-bar/status-bar.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { HistoryDialogComponent } from './dialogues/history-dialog/history-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
  declarations: [
    AppComponent,
    ShotlistComponent,
    QueryComponent,
    MessageBarComponent,
    ConfigFormComponent,
    HelpSectionComponent,
    ExplDialogComponent,
    StatusBarComponent,
    HistoryDialogComponent,
  ],
  exports: [
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatTooltipModule,
    HttpClientModule,
    FormsModule,
    BrowserAnimationsModule,
    MatIconModule,
    MatSliderModule,
    MatButtonToggleModule,
    MatInputModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    ScrollingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }


