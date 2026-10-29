import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationToast {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration: number; // in milliseconds
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly DEFAULT_DURATION = 4500;
  readonly notifications = signal<NotificationToast[]>([]);

  show(
    type: NotificationType,
    message: string,
    title?: string,
    duration = this.DEFAULT_DURATION
  ): string {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const toast: NotificationToast = {
      id,
      type,
      message,
      title,
      duration,
      timestamp: Date.now()
    };

    this.notifications.update((list) => [...list, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  success(message: string, title?: string, duration?: number): string {
    return this.show('success', message, title || 'Succès', duration);
  }

  error(message: string, title?: string, duration?: number): string {
    return this.show('error', message, title || 'Erreur', duration || 6000);
  }

  warning(message: string, title?: string, duration?: number): string {
    return this.show('warning', message, title || 'Attention', duration || 5000);
  }

  info(message: string, title?: string, duration?: number): string {
    return this.show('info', message, title || 'Information', duration);
  }

  remove(id: string): void {
    this.notifications.update((list) => list.filter((n) => n.id !== id));
  }

  clear(): void {
    this.notifications.set([]);
  }
}
