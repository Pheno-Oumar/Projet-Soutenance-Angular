import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmationService, ActiveConfirmation } from '../../services/confirmation.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.css'
})
export class ConfirmationModalComponent {
  protected readonly confirmationService = inject(ConfirmationService);

  get active(): ActiveConfirmation | null {
    return this.confirmationService.currentConfirmation();
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event?: Event): void {
    if (this.active) {
      event?.preventDefault();
      this.onCancel();
    }
  }

  handleTextareaEnter(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (kbEvent?.ctrlKey) {
      this.onConfirm();
    }
  }

  onConfirm(): void {
    this.confirmationService.handleConfirm();
  }

  onCancel(): void {
    this.confirmationService.handleCancel();
  }
}
