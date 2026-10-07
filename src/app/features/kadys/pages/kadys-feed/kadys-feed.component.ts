import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { KadysService } from '../../../../core/services/kadys.service';
import { GuestStorageService } from '../../../../core/services/guest-storage.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { KadysRealisation, SalonStories } from '../../../../shared/models';
import { StoryReelBarComponent } from '../../components/story-reel-bar/story-reel-bar.component';
import { StoryViewerModalComponent } from '../../components/story-viewer-modal/story-viewer-modal.component';
import { CommentDrawerComponent } from '../../components/comment-drawer/comment-drawer.component';
import { PublicNavbarComponent } from '../../../../core/layout/public-navbar/public-navbar.component';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { HlsVideoDirective } from '../../../../shared/directives/hls-video.directive';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-kadys-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StoryReelBarComponent,
    StoryViewerModalComponent,
    CommentDrawerComponent,
    PublicNavbarComponent,
    SafeMediaUrlPipe,
    HlsVideoDirective,
    MatIconModule
  ],
  templateUrl: './kadys-feed.component.html',
  styleUrls: ['./kadys-feed.component.css']
})
export class KadysFeedComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly kadysService = inject(KadysService);
  private readonly guestStorage = inject(GuestStorageService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChildren('videoElement') videoElements!: QueryList<ElementRef<HTMLVideoElement>>;

  readonly feed = signal<KadysRealisation[]>([]);
  readonly stories = signal<SalonStories[]>([]);
  readonly chargement = signal<boolean>(true);
  readonly isMuted = signal<boolean>(true);

  // Modals state
  selectedSalonStory: SalonStories | null = null;
  selectedRealisationComments: KadysRealisation | null = null;

  // Double tap state
  private lastTap = 0;
  activeHeartId: number | null = null;
  private heartTimeout: any = null;

  private intersectionObserver: IntersectionObserver | null = null;

  // Video progress tracking
  videoProgressMap: { [id: number]: number } = {};

  onVideoTimeUpdate(event: Event, id: number): void {
    const video = event.target as HTMLVideoElement;
    if (video.duration && !isNaN(video.duration)) {
      this.videoProgressMap[id] = (video.currentTime / video.duration) * 100;
    }
  }

  isMediaVideo(url?: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.m3u8') || lower.includes('.m3u8') || lower.includes('/video/upload/')) {
      return true;
    }
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.includes('/image/upload/')) {
      return false;
    }
    return true;
  }

  ngOnInit(): void {
    this.chargerStories();
    this.chargerFeed();
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.heartTimeout) {
      clearTimeout(this.heartTimeout);
    }
  }

  chargerStories(): void {
    this.kadysService.getStoriesPourKadys().subscribe({
      next: (list) => this.stories.set(list),
      error: () => {}
    });
  }

  chargerFeed(): void {
    this.chargement.set(true);
    this.kadysService.getFeed(0, 15).subscribe({
      next: (page) => {
        // Hydrate liked status from guestStorage if user is not logged in
        const list = page.content.map((item) => {
          if (!this.authService.isAuthenticated()) {
            return {
              ...item,
              isLikedByCurrentUser: this.guestStorage.isKadysLiked(item.id)
            };
          }
          return item;
        });

        this.feed.set(list);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
      }
    });
  }

  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            video.play().catch(() => {});
            const realId = video.getAttribute('data-id');
            if (realId) {
              this.kadysService.enregistrerVue(+realId).subscribe({ error: () => {} });
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0.6] }
    );

    this.videoElements.changes.subscribe((elements: QueryList<ElementRef<HTMLVideoElement>>) => {
      elements.forEach((el) => {
        this.intersectionObserver?.observe(el.nativeElement);
      });
    });

    this.videoElements.forEach((el) => {
      this.intersectionObserver?.observe(el.nativeElement);
    });
  }

  toggleSound(): void {
    this.isMuted.update((v) => !v);
    this.videoElements.forEach((el) => {
      el.nativeElement.muted = this.isMuted();
    });
  }

  togglePlayPause(video: HTMLVideoElement): void {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  handleVideoDoubleTap(realisation: KadysRealisation): void {
    const now = Date.now();
    const delay = now - this.lastTap;

    if (delay < 350 && delay > 0) {
      // Double tap triggered
      this.trigger3DHeartAnimation(realisation.id);
      if (!realisation.isLikedByCurrentUser) {
        this.toggleLike(realisation);
      }
    }
    this.lastTap = now;
  }

  private trigger3DHeartAnimation(id: number): void {
    this.activeHeartId = id;
    if (this.heartTimeout) {
      clearTimeout(this.heartTimeout);
    }
    this.heartTimeout = setTimeout(() => {
      this.activeHeartId = null;
    }, 900);
  }

  toggleLike(realisation: KadysRealisation): void {
    const isCurrentlyLiked = realisation.isLikedByCurrentUser;
    const estConnecte = this.authService.isAuthenticated();

    if (estConnecte) {
      // Backend toggle
      this.kadysService.toggleLike(realisation.id).subscribe({
        next: (res) => {
          realisation.isLikedByCurrentUser = res.liked;
          realisation.totalLikes = res.totalLikes;
        },
        error: () => {
          this.notificationService.error('Erreur lors du like');
        }
      });
    } else {
      // Guest local storage toggle
      const newStatus = this.guestStorage.toggleKadysLike(realisation.id);
      realisation.isLikedByCurrentUser = newStatus;
      realisation.totalLikes += newStatus ? 1 : -1;
      this.notificationService.info(
        newStatus
          ? 'Ajouté à vos inspirations (enregistré localement)'
          : 'Retiré de vos inspirations'
      );
    }
  }

  openComments(realisation: KadysRealisation): void {
    this.selectedRealisationComments = realisation;
  }

  closeComments(): void {
    this.selectedRealisationComments = null;
  }

  openStoryViewer(salonStory: SalonStories): void {
    this.selectedSalonStory = salonStory;
  }

  closeStoryViewer(): void {
    this.selectedSalonStory = null;
  }

  reserverCeLook(realisation: KadysRealisation): void {
    // Navigate directly to the salon's vitrine with a booking prompt
    this.router.navigate(['/' + realisation.salonSlug + '/vitrine'], {
      queryParams: { bookLook: realisation.id, title: realisation.titre }
    });
  }

  partagerRealisation(realisation: KadysRealisation): void {
    const shareUrl = `${window.location.origin}/kadys#look-${realisation.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.notificationService.success('Lien du look copié dans le presse-papiers !');
      });
    } else {
      this.notificationService.info(`Lien : ${shareUrl}`);
    }
  }
}
