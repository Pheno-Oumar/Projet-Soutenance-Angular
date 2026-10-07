import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList,
  inject,
  signal
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { SalonBookingStore } from '../../state/salon-booking.store';
import { GuestStorageService } from '../../../../core/services/guest-storage.service';
import { AuthGateService } from '../../state/auth-gate.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { FlyToTargetService } from '../../interactions/fly-to-target.service';
import { Realisation, PrestationCatalogue } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { firstValueFrom } from 'rxjs';

interface MockComment {
  id: number;
  auteur: string;
  texte: string;
  temps: string;
  avatar?: string;
}

import { HlsVideoDirective } from '../../../../shared/directives/hls-video.directive';

@Component({
  selector: 'app-salon-realisations-player',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule, HlsVideoDirective],
  templateUrl: './salon-realisations-player.component.html',
  styleUrl: './salon-realisations-player.component.css'
})
export class SalonRealisationsPlayerComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly vitrineService = inject(VitrineService);
  private readonly guestStorage = inject(GuestStorageService);
  private readonly authGateService = inject(AuthGateService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly flyToTargetService = inject(FlyToTargetService);
  readonly contextStore = inject(SalonContextStore);
  readonly bookingStore = inject(SalonBookingStore);

  readonly realisations = signal<Realisation[]>([]);
  readonly prestations = signal<PrestationCatalogue[]>([]);
  readonly activeIndex = signal<number>(0);
  readonly isMuted = signal<boolean>(true);
  readonly isLoading = signal<boolean>(true);

  // Animation de double tap coeur
  readonly showHeartAnim = signal<boolean>(false);
  readonly heartPosition = signal<{ x: number; y: number }>({ x: 50, y: 50 });

  // Tiroir de commentaires
  readonly isCommentsOpen = signal<boolean>(false);
  readonly nouveauCommentaire = signal<string>('');
  readonly comments = signal<MockComment[]>([
    { id: 1, auteur: 'Aïssata D.', texte: 'Incroyable travail ! Le dégradé est parfait.', temps: 'Il y a 2h' },
    { id: 2, auteur: 'Mariam T.', texte: 'Je veux exactement la même coupe pour mon mariage !', temps: 'Il y a 5h' },
    { id: 3, auteur: 'Ousmane K.', texte: 'L’un des meilleurs salons de la ville, sans hésiter.', temps: 'Il y a 1j' }
  ]);

  @ViewChildren('videoEl') videoElements!: QueryList<ElementRef<HTMLVideoElement>>;
  @ViewChildren('slideEl') slideElements!: QueryList<ElementRef<HTMLElement>>;

  get slugSalon(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const s = r.snapshot.paramMap.get('slugSalon');
      if (s) return s;
      r = r.parent;
    }
    return this.contextStore.currentSlug();
  }

  get currentRealisation(): Realisation | null {
    const list = this.realisations();
    const idx = this.activeIndex();
    return list[idx] || null;
  }

  async ngOnInit(): Promise<void> {
    const slug = this.slugSalon;
    if (slug) {
      await this.chargerDonnees(slug);
    }

    // Écoute de la hiérarchie de routes au cas où l'injection se fait de manière asynchrone
    this.route.parent?.paramMap.subscribe((params) => {
      const parentSlug = params.get('slugSalon') || this.slugSalon;
      if (parentSlug && this.realisations().length === 0) {
        this.chargerDonnees(parentSlug);
      }
    });
  }

  private async chargerDonnees(slug: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const [list, prestatList] = await Promise.all([
        firstValueFrom(this.vitrineService.getRealisations(slug)).catch(() => [] as Realisation[]),
        firstValueFrom(this.vitrineService.getServices(slug)).catch(() => [] as PrestationCatalogue[])
      ]);

      this.realisations.set(list || []);
      this.prestations.set(prestatList || []);

      const targetIdStr = this.route.snapshot.paramMap.get('id');
      const targetId = targetIdStr ? parseInt(targetIdStr, 10) : null;
      if (targetId && list) {
        const idx = list.findIndex((r) => r.id === targetId);
        if (idx >= 0) {
          this.activeIndex.set(idx);
        }
      }
      setTimeout(() => {
        this.scrollToIndex(this.activeIndex());
      }, 250);
    } catch {
      this.realisations.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  ngAfterViewInit(): void {
    this.videoElements.changes.subscribe(() => {
      setTimeout(() => {
        this.scrollToIndex(this.activeIndex());
      }, 150);
    });
    setTimeout(() => {
      this.scrollToIndex(this.activeIndex());
    }, 300);
  }

  onScrollFeed(container: HTMLElement): void {
    const height = container.clientHeight;
    if (!height) return;

    const scrollTop = container.scrollTop;
    const newIndex = Math.round(scrollTop / height);

    if (newIndex !== this.activeIndex() && newIndex >= 0 && newIndex < this.realisations().length) {
      this.activeIndex.set(newIndex);
      this.playVideoAtIndex(newIndex);

      // Mettre à jour l'URL sans rechargement de page
      const current = this.realisations()[newIndex];
      if (current) {
        this.location.replaceState(`/${this.slugSalon}/realisations/${current.id}`);
      }
    }
  }

  scrollToIndex(index: number): void {
    const slides = this.slideElements.toArray();
    if (slides[index]) {
      slides[index].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      this.playVideoAtIndex(index);
    }
  }

  playVideoAtIndex(index: number): void {
    const videos = this.videoElements ? this.videoElements.toArray() : [];
    videos.forEach((ref, idx) => {
      const v = ref.nativeElement;
      if (idx === index) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }

  togglePlayPause(video: HTMLVideoElement, event?: Event): void {
    if (event) event.stopPropagation();
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  toggleMute(): void {
    this.isMuted.update((m) => !m);
  }

  isLiked(realisationId: number): boolean {
    return this.guestStorage.isKadysLiked(realisationId);
  }

  toggleLike(r: Realisation, event?: Event): void {
    if (event) event.stopPropagation();
    const liked = this.guestStorage.toggleKadysLike(r.id);
    if (liked) {
      this.notificationService.success('Ajouté à vos inspirations coup de cœur !');
    }
  }

  onDoubleTapVideo(event: MouseEvent, r: Realisation): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.heartPosition.set({ x, y });
    this.showHeartAnim.set(true);

    if (!this.isLiked(r.id)) {
      this.toggleLike(r);
    }

    setTimeout(() => {
      this.showHeartAnim.set(false);
    }, 800);
  }

  getLikesCount(r: Realisation): string {
    const base = r?.totalLikes || 0;
    const bonus = this.isLiked(r.id) ? 1 : 0;
    const total = base + bonus;
    if (total >= 1000000) return (total / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (total >= 1000) return (total / 1000).toFixed(1).replace('.0', '') + 'k';
    return total.toString();
  }

  getViewsCount(r: Realisation): string {
    const val = r?.totalVues || 0;
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1).replace('.0', '') + 'k';
    return val.toString();
  }

  reserverCeStyle(event: MouseEvent, r: Realisation): void {
    event.stopPropagation();
    const btn = event.currentTarget as HTMLElement;

    // Parabolic fly-to animation vers le bouton RDV
    this.flyToTargetService.fly(btn, '.dock-btn-rdv, .btn-salon-rdv', {
      color: '#C8B6A6',
      icon: 'calendar_month'
    });

    // Trouver une variante ou prestation associée ou générique
    let matchingVariante = null;
    for (const p of this.prestations()) {
      if (p.variantes && p.variantes.length > 0) {
        matchingVariante = {
          id: p.variantes[0].id,
          serviceId: p.id,
          serviceNom: p.nom,
          varianteNom: p.variantes[0].nom || r.titre,
          dureeMinutes: p.variantes[0].dureeMinutes || 45,
          prix: p.variantes[0].prix || 15000
        };
        break;
      }
    }

    if (!matchingVariante) {
      matchingVariante = {
        id: 999000 + r.id,
        serviceNom: 'Rituel Signature',
        varianteNom: r.titre,
        dureeMinutes: 60,
        prix: 15000
      };
    }

    this.bookingStore.addVariante(matchingVariante);

    if (r.coiffeurId && r.coiffeurNomComplet) {
      this.bookingStore.setCoiffeur(r.coiffeurId, r.coiffeurNomComplet);
    }

    this.notificationService.success(`Style « ${r.titre} » ajouté à votre rendez-vous !`);
    this.bookingStore.openDrawer();
  }

  openComments(event: Event): void {
    event.stopPropagation();
    this.isCommentsOpen.set(true);
  }

  closeComments(): void {
    this.isCommentsOpen.set(false);
  }

  envoyerCommentaire(): void {
    const text = this.nouveauCommentaire().trim();
    if (!text) return;

    if (!this.authService.isAuthenticated()) {
      this.authGateService.open({
        title: 'Rejoignez la communauté',
        message: 'Pour commenter cette création et échanger avec nos coiffeurs, connectez-vous ou inscrivez-vous en quelques secondes.',
        actionType: 'REVIEW',
        salonNom: this.contextStore.salon()?.nom
      });
      return;
    }

    const user = this.authService.currentUser();
    const auteur = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : 'Vous';

    this.comments.update((list) => [
      {
        id: Date.now(),
        auteur: auteur || 'Vous',
        texte: text,
        temps: 'À l’instant'
      },
      ...list
    ]);
    this.nouveauCommentaire.set('');
    this.notificationService.success('Votre commentaire a été publié !');
  }

  partagerLien(r: Realisation, event?: Event): void {
    if (event) event.stopPropagation();
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    this.notificationService.info('Lien de la vidéo copié dans votre presse-papier !');
  }

  fermerLecteur(): void {
    this.router.navigate(['/' + this.slugSalon + '/realisations']);
  }
}
