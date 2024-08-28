import { Component, Output, EventEmitter } from '@angular/core';
import { QueryType } from '../../shared/config/global-constants';

@Component({
  selector: 'app-history-dialog',
  templateUrl: './history-dialog.component.html',
  styleUrls: ['./history-dialog.component.scss']
})
export class HistoryDialogComponent {
  @Output() clickOnClose: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();
  @Output() historySelected: EventEmitter<QueryType> = new EventEmitter();
  @Output() historyInputFieldFocusChange = new EventEmitter<boolean>();

  historyList: QueryType[] = [];
  displayHistory: string[] = [];
  filteredHistory: QueryType[] = [];
  uniqueTypes: string[] = [];
  uniqueDataset: string[] = [];
  searchTerm: string = '';
  filterType: string = '';
  filterDataset: string = '';
  inputFieldFocus: boolean = false;

  constructor() { }

  ngOnInit(): void {
    this.loadHistory();
  }

  onHistoryItemClick(item: QueryType): void {
    console.log(item)
    this.historySelected.emit(item);
  }

  loadHistory(): void {
    let hist = localStorage.getItem('history');
    if (hist) {
      let histj: QueryType[] = JSON.parse(hist);
      this.historyList = histj;
      this.displayHistory = histj.map(ho => this.getFormattedString(ho));

      this.uniqueTypes = Array.from(new Set(histj.map(ho => ho.type)));
      this.uniqueDataset = Array.from(new Set(histj.map(ho => ho.dataset)));

      this.filteredHistory = [...histj];
    }
  }

  filterList(): void {
    this.filteredHistory = this.historyList.filter(item =>
      (this.filterType ? item.type.toLowerCase() === this.filterType.toLowerCase() : true) &&
      (this.searchTerm ? (this.getFormattedString(item).toLowerCase().includes(this.searchTerm.toLowerCase())) : true)
    );
    this.displayHistory = this.filteredHistory.map(item => this.getFormattedString(item));
  }

  getFormattedString(item: QueryType): string {
    return `<i>${item.type}:</i> <b>${item.query}</b> <i>(${item.dataset})</i>`;
  }

  onInputFocus() {
    this.inputFieldFocus = true;
    this.historyInputFieldFocusChange.emit(true);
  }

  onInputBlur() {
    this.inputFieldFocus = false
    this.historyInputFieldFocusChange.emit(true);
  }
}

