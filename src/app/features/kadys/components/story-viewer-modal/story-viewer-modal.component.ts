import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SalonStories, Story } from '../../../../shared/models';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { HlsVideoDirective } from '../../../../shared/directives/hls-video.directive';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-story-viewer-modal',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeMediaUrlPipe, HlsVideoDirective, MatIconModule],
  templateUrl: './story-viewer-modal.component.html',
  styleUrls: ['./story-viewer-modal.component.css']
})
export class StoryViewerModalComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() salonStory!: SalonStories;
  @Output() close = new EventEmitter<void>();

  currentIndex = 0;
  progress = 0;
  isPaused = false;
  private timerInterval: any = null;
  private readonly STORY_DURATION_MS = 5000;
  private readonly TICK_INTERVAL_MS = 50;

  get currentStory(): Story | null {
    if (!this.salonStory || !this.salonStory.stories || this.salonStory.stories.length === 0) {
      return null;
    }
    return this.salonStory.stories[this.currentIndex] || null;
  }

  ngOnInit(): void {
    this.startStory();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeModal();
    } else if (event.key === 'ArrowRight') {
      this.nextStory();
    } else if (event.key === 'ArrowLeft') {
      this.prevStory();
    }
  }

  startStory(): void {
    this.progress = 0;
    this.stopTimer();

    const step = (this.TICK_INTERVAL_MS / this.STORY_DURATION_MS) * 100;
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.progress += step;
        if (this.progress >= 100) {
          this.nextStory();
        }
        this.cdr.markForCheck();
      }
    }, this.TICK_INTERVAL_MS);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  pauseStory(): void {
    this.isPaused = true;
  }

  resumeStory(): void {
    this.isPaused = false;
  }

  nextStory(): void {
    if (this.currentIndex < this.salonStory.stories.length - 1) {
      this.currentIndex++;
      this.startStory();
    } else {
      // Finished all stories
      this.closeModal();
    }
  }

  prevStory(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.startStory();
    } else {
      this.progress = 0;
    }
  }

  closeModal(): void {
    this.stopTimer();
    this.close.emit();
  }

  getStoryTimeRemaining(dateExp: string): string {
    if (!dateExp) return '24h';
    const diff = new Date(dateExp).getTime() - new Date().getTime();
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h restante${hours > 1 ? 's' : ''}`;
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}min restante${minutes > 1 ? 's' : ''}`;
  }
}
