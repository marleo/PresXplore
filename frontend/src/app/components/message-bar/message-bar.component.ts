import { Component } from '@angular/core';

@Component({
  selector: 'app-message-bar',
  templateUrl: './message-bar.component.html',
  styleUrls: ['./message-bar.component.scss']
})
export class MessageBarComponent {
  isSuccessVisible = false;
  isErrorVisible = false;
  errorMessage = '';
  successMessage = '';

  showSuccessMessage(tempMessage: string) {
    if (this.successMessage != '') {
      this.successMessage += ' ' + tempMessage;
    } else {
      this.successMessage = tempMessage;
    }
    this.isSuccessVisible = true;

    setTimeout(() => {
      this.isSuccessVisible = false;
      this.successMessage = '';
    }, 1000);
  }

  showErrorMessage(tempMessage: string) {
    if (this.errorMessage != '') {
      this.errorMessage += ' --- ' + tempMessage;
    } else {
      this.errorMessage = tempMessage;
    }
    this.isErrorVisible = true;

    setTimeout(() => {
      this.isErrorVisible = false;
      this.errorMessage = '';
    }, 4000);
  }
}
