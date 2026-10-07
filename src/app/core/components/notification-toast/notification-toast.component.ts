import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, NotificationToast } from '../../services/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './notification-toast.component.html',
  styleUrl: './notification-toast.component.css'
})
export class NotificationToastComponent {
  protected readonly notificationService = inject(NotificationService);

  get notifications(): NotificationToast[] {
    return this.notificationService.notifications();
  }

  close(id: string): void {
    this.notificationService.remove(id);
  }
}
