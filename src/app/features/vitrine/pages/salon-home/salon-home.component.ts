import {
  Component,
  OnInit,
  HostListener,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

import { SalonContextStore } from '../../state/salon-context.store';
import { SalonBookingStore, SelectedBookingVariante } from '../../state/salon-booking.store';
import { SalonCartStore } from '../../state/salon-cart.store';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { FlyToTargetService } from '../../interactions/fly-to-target.service';
import { RevealOnScrollDirective } from '../../interactions/reveal-on-scroll.directive';
import { Tilt3dDirective } from '../../interactions/tilt-3d.directive';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { MediaProxyService } from '../../../../core/services/media-proxy.service';

import {
  PrestationCatalogue,
  Produit,
  Realisation,
  ProfilCoiffeur,
  AvisSalon
} from '../../../../shared/models';

import { HlsVideoDirective } from '../../../../shared/directives/hls-video.directive';

@Component({
  selector: 'app-salon-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    RevealOnScrollDirective,
    Tilt3dDirective,
    SafeMediaUrlPipe,
    HlsVideoDirective
  ],
  templateUrl: './salon-home.component.html',
  styleUrl: './salon-home.component.css'
})
export class SalonHomeComponent implements OnInit {
  readonly contextStore = inject(SalonContextStore);
  readonly bookingStore = inject(SalonBookingStore);
  readonly cartStore = inject(SalonCartStore);
  readonly vitrineService = inject(VitrineService);
  readonly authService = inject(AuthService);
  readonly flyToTargetService = inject(FlyToTargetService);
  private readonly mediaProxy = inject(MediaProxyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Données réactives du salon
  readonly salon = this.contextStore.salon;
  readonly ouverture = this.contextStore.ouvertureStatus;

  readonly defaultCoverUrl = 'assets/imagesalon.png';
  readonly heroCoverUrl = computed(() => {
    const cover = this.salon()?.coverUrl;
    return cover ? this.mediaProxy.getSafeMediaUrl(cover) : this.defaultCoverUrl;
  });

  // Données de la vitrine
  readonly services = signal<PrestationCatalogue[]>([]);
  readonly produits = signal<Produit[]>([]);
  readonly realisations = signal<Realisation[]>([]);
  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly avis = signal<AvisSalon[]>([]);
  readonly isLoadingData = signal<boolean>(true);

  // État des cartes équipe retournées (Flip 3D)
  readonly flippedCards = signal<Set<number>>(new Set());

  get slugSalon(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const s = r.snapshot.paramMap.get('slugSalon');
      if (s) return s;
      r = r.parent;
    }
    return this.contextStore.currentSlug();
  }

  formatCount(count?: number): string {
    const val = count || 0;
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1).replace('.0', '') + 'M';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return val.toString();
  }

  // Réalisations avec vidéo valide uniquement
  readonly realisationsAvecVideo = computed<Realisation[]>(() => {
    return this.realisations().filter(r => !!r.urlVideo && r.urlVideo.trim().length > 5);
  });

  // Aplatir les variantes signatures pour le carrousel Coverflow (top 6)
  readonly variantesSignatures = computed<SelectedBookingVariante[]>(() => {
    const list: SelectedBookingVariante[] = [];
    for (const service of this.services()) {
      if (service.statut !== false && service.variantes && service.variantes.length > 0) {
        for (const v of service.variantes) {
          if (v.statut !== false) {
            const allImgs: string[] = [];
            if (v.imageUrl) {
              allImgs.push(v.imageUrl);
            }
            if (v.imagesUrls && v.imagesUrls.length > 0) {
              for (const u of v.imagesUrls) {
                if (u && !allImgs.includes(u)) {
                  allImgs.push(u);
                }
              }
            }
            if (allImgs.length === 0 && service.imageUrl) {
              allImgs.push(service.imageUrl);
            }
            list.push({
              id: v.id,
              serviceId: service.id,
              serviceNom: service.nom,
              varianteNom: v.nom,
              dureeMinutes: v.dureeMinutes,
              prix: v.prix,
              imageUrl: allImgs[0] || v.imageUrl || service.imageUrl,
              description: v.description || service.description,
              imagesUrls: allImgs
            });
            if (list.length >= 6) break;
          }
        }
      }
      if (list.length >= 6) break;
    }
    return list;
  });

  // État de la modal Quick-View (Variante & Produit)
  readonly selectedDetailVariante = signal<SelectedBookingVariante | null>(null);
  readonly selectedDetailProduit = signal<Produit | null>(null);
  readonly activeModalImageIndex = signal<number>(0);

  openVarianteModal(item: SelectedBookingVariante): void {
    this.selectedDetailProduit.set(null);
    this.activeModalImageIndex.set(0);
    this.selectedDetailVariante.set(item);
  }

  openProduitModal(p: Produit): void {
    this.selectedDetailVariante.set(null);
    this.activeModalImageIndex.set(0);
    this.selectedDetailProduit.set(p);
  }

  closeDetailModal(): void {
    this.selectedDetailVariante.set(null);
    this.selectedDetailProduit.set(null);
  }

  setModalImageIndex(index: number): void {
    this.activeModalImageIndex.set(index);
  }

  prevModalImage(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const total = this.modalImages().length;
    if (total <= 1) return;
    this.activeModalImageIndex.update((idx) => (idx - 1 + total) % total);
  }

  nextModalImage(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const total = this.modalImages().length;
    if (total <= 1) return;
    this.activeModalImageIndex.update((idx) => (idx + 1) % total);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDetailModal();
  }

  @HostListener('document:keydown.arrowleft', ['$event'])
  onArrowLeft(event: Event): void {
    if (this.selectedDetailVariante() || this.selectedDetailProduit()) {
      event.preventDefault();
      this.prevModalImage();
    }
  }

  @HostListener('document:keydown.arrowright', ['$event'])
  onArrowRight(event: Event): void {
    if (this.selectedDetailVariante() || this.selectedDetailProduit()) {
      event.preventDefault();
      this.nextModalImage();
    }
  }

  readonly modalImages = computed<string[]>(() => {
    const v = this.selectedDetailVariante();
    if (v) {
      const imgs: string[] = [];
      if (v.imageUrl) imgs.push(v.imageUrl);
      if (v.imagesUrls && v.imagesUrls.length > 0) {
        for (const u of v.imagesUrls) {
          if (u && !imgs.includes(u)) {
            imgs.push(u);
          }
        }
      }
      return imgs;
    }
    const p = this.selectedDetailProduit();
    if (p) {
      const imgs: string[] = [];
      if (p.imageUrl) imgs.push(p.imageUrl);
      if (p.imagesUrls && p.imagesUrls.length > 0) {
        for (const u of p.imagesUrls) {
          if (u && !imgs.includes(u)) {
            imgs.push(u);
          }
        }
      }
      return imgs;
    }
    return [];
  });

  readonly currentModalImage = computed<string | null>(() => {
    const imgs = this.modalImages();
    if (imgs.length === 0) return null;
    const idx = this.activeModalImageIndex();
    return imgs[idx] || imgs[0] || null;
  });

  // Note moyenne des avis
  readonly noteMoyenne = computed<number>(() => {
    const list = this.avis();
    if (!list || list.length === 0) return 0;
    const sum = list.reduce((acc, a) => acc + (a.note || 5), 0);
    return Number((sum / list.length).toFixed(1));
  });

  // Avis affichés : Si le salon n'a pas d'avis, aucune donnée statique
  readonly avisAffiches = computed<AvisSalon[]>(() => {
    const raw = this.avis();
    return raw && raw.length > 0 ? raw : [];
  });

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const slug = this.slugSalon;
    if (slug) {
      this.loadAllSalonData(slug);
    }
    // Écoute de la route parente (:slugSalon) en cas d'accès direct ou rafraîchissement
    this.route.parent?.paramMap.subscribe((params) => {
      const parentSlug = params.get('slugSalon');
      if (parentSlug && (this.realisations().length === 0 && this.services().length === 0)) {
        this.loadAllSalonData(parentSlug);
      }
    });
  }

  /**
   * Charge toutes les données de vitrine pour la page d'accueil
   */
  private async loadAllSalonData(forcedSlug?: string): Promise<void> {
    const slug = forcedSlug || this.slugSalon;
    if (!slug) return;

    this.isLoadingData.set(true);

    try {
      const [
        servicesData,
        produitsData,
        realisationsData,
        coiffeursData,
        avisData
      ] = await Promise.all([
        firstValueFrom(this.vitrineService.getServices(slug)).catch(() => [] as PrestationCatalogue[]),
        firstValueFrom(this.vitrineService.getProduits(slug)).catch(() => [] as Produit[]),
        firstValueFrom(this.vitrineService.getRealisations(slug)).catch(() => [] as Realisation[]),
        firstValueFrom(this.vitrineService.getCoiffeurs(slug)).catch(() => [] as ProfilCoiffeur[]),
        firstValueFrom(this.vitrineService.getAvis(slug)).catch(() => [] as AvisSalon[])
      ]);

      // Ne conserver que les services actifs avec au moins une variante active
      const servicesValides = (servicesData || []).filter(
        (s) => s.statut && s.variantes && s.variantes.some((v) => v.statut !== false)
      );
      // Ne conserver que les produits actifs
      const produitsValides = (produitsData || []).filter((p) => p.statut);

      this.services.set(servicesValides);
      this.produits.set(produitsValides.slice(0, 8)); // Top 8 produits
      this.realisations.set((realisationsData || []).slice(0, 6)); // Top 6 réalisations
      this.coiffeurs.set(coiffeursData || []);
      this.avis.set(avisData || []);
    } catch {
      // Ignorer les erreurs réseau pour laisser l'interface s'afficher
    } finally {
      this.isLoadingData.set(false);
    }
  }

  // =========================================================
  // ACTIONS D'AJOUT AU RDV / AU PANIER AVEC ANIMATION FLY
  // =========================================================

  async onAddVariante(event: MouseEvent, item: SelectedBookingVariante): Promise<void> {
    event.stopPropagation();

    // 1. Déclencher animation volante vers le dock ou la navbar
    const buttonEl = event.currentTarget as HTMLElement;
    this.flyToTargetService.fly(buttonEl, '.dock-btn-booking, .btn-salon-cta-book', {
      color: '#4A3B32',
      icon: 'calendar_month'
    });

    // 2. Ajouter au store
    this.bookingStore.addVariante(item);
  }

  isVarianteSelected(id: number): boolean {
    return this.bookingStore.isVarianteSelected(id);
  }

  async onAddProduitToCart(event: MouseEvent, produit: Produit): Promise<void> {
    event.stopPropagation();

    const buttonEl = event.currentTarget as HTMLElement;
    this.flyToTargetService.fly(buttonEl, '.dock-btn-cart, .btn-salon-cart', {
      color: '#C8B6A6',
      icon: 'shopping_bag'
    });

    this.cartStore.ajouterProduit(this.slugSalon, {
      id: produit.id,
      nom: produit.nom,
      prixVente: produit.prixVente,
      imageUrl: produit.imageUrl,
      quantiteDisponible: produit.stock?.quantiteDisponible
    });
  }

  // =========================================================
  // GESTION DU FLIP 3D DES CARTES COIFFEURS
  // =========================================================

  toggleCardFlip(id: number): void {
    const current = new Set(this.flippedCards());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.flippedCards.set(current);
  }

  isCardFlipped(id: number): boolean {
    return this.flippedCards().has(id);
  }

  bookWithCoiffeur(event: MouseEvent, coiffeur: ProfilCoiffeur): void {
    event.stopPropagation();
    this.bookingStore.setCoiffeur(coiffeur.id, `${coiffeur.coiffeurPrenom} ${coiffeur.coiffeurNom}`);
    this.bookingStore.openDrawer();
  }

  openGoogleMaps(): void {
    const s = this.salon();
    if (!s) return;
    let url = 'https://www.google.com/maps/dir/?api=1&destination=';
    if (s.latitude && s.longitude) {
      url += `${s.latitude},${s.longitude}`;
    } else {
      url += encodeURIComponent(`${s.nom} ${s.adresse || ''}`);
    }
    window.open(url, '_blank');
  }

  // =========================================================
  // GESTION DU SURVOL DES VIDÉOS DE RÉALISATIONS
  // =========================================================

  playPreview(video: HTMLVideoElement): void {
    if (video) {
      video.play().catch(() => {});
    }
  }

  pausePreview(video: HTMLVideoElement): void {
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }
}
