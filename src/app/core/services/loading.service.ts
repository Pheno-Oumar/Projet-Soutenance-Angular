import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private readonly activeRequestsCount = signal<number>(0);

  readonly isLoading = computed(() => this.activeRequestsCount() > 0);

  show(): void {
    this.activeRequestsCount.update((count) => count + 1);
  }

  hide(): void {
    this.activeRequestsCount.update((count) => Math.max(0, count - 1));
  }

  forceReset(): void {
    this.activeRequestsCount.set(0);
  }
}
