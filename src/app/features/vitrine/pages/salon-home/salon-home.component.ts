import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';
import { firstValueFrom } from 'rxjs';

import { SalonContextStore } from '../../state/salon-context.store';
import { SalonBookingStore, SelectedBookingVariante } from '../../state/salon-booking.store';
import { SalonCartStore } from '../../state/salon-cart.store';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { FlyToTargetService } from '../../interactions/fly-to-target.service';
import { RevealOnScrollDirective } from '../../interactions/reveal-on-scroll.directive';
import { Tilt3dDirective } from '../../interactions/tilt-3d.directive';
import { SalonHero3dComponent } from '../../components/salon-hero-3d/salon-hero-3d.component';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';

import {
  PrestationCatalogue,
  Produit,
  Realisation,
  Story,
  ProfilCoiffeur,
  AvisSalon,
  HoraireOuverture
} from '../../../../shared/models';

import { HlsVideoDirective } from '../../../../shared/directives/hls-video.directive';

@Component({
  selector: 'app-salon-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    SalonHero3dComponent,
    RevealOnScrollDirective,
    Tilt3dDirective,
    SafeMediaUrlPipe,
    HlsVideoDirective
  ],
  templateUrl: './salon-home.component.html',
  styleUrl: './salon-home.component.css'
})
export class SalonHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly contextStore = inject(SalonContextStore);
  readonly bookingStore = inject(SalonBookingStore);
  readonly cartStore = inject(SalonCartStore);
  readonly vitrineService = inject(VitrineService);
  readonly authService = inject(AuthService);
  readonly flyToTargetService = inject(FlyToTargetService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('mapElement') mapElement?: ElementRef<HTMLDivElement>;
  private leafletMap?: L.Map;

  // Données réactives du salon
  readonly salon = this.contextStore.salon;
  readonly ouverture = this.contextStore.ouvertureStatus;
  readonly horaires = this.contextStore.horaires;

  // Données de la vitrine
  readonly stories = signal<Story[]>([]);
  readonly services = signal<PrestationCatalogue[]>([]);
  readonly produits = signal<Produit[]>([]);
  readonly realisations = signal<Realisation[]>([]);
  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly avis = signal<AvisSalon[]>([]);
  readonly isLoadingData = signal<boolean>(true);

  // État de la visionneuse de Stories
  readonly selectedStory = signal<Story | null>(null);
  readonly activeStoryIndex = signal<number>(0);
  readonly storyProgress = signal<number>(0);
  readonly isStoryPaused = signal<boolean>(false);
  private storyTimer?: any;
  private storyProgressInterval?: any;

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

  // Salutation intelligente selon l'heure
  readonly salutation = computed(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour';
    if (hour >= 12 && hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  });

  // Réalisations avec vidéo valide uniquement
  readonly realisationsAvecVideo = computed<Realisation[]>(() => {
    return this.realisations().filter(r => !!r.urlVideo && r.urlVideo.trim().length > 5);
  });

  // Client connecté ou visiteur
  readonly clientDisplayName = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return null;
    return `${user.prenom || ''}`.trim() || null;
  });

  // Aplatir les variantes signatures pour le carrousel Coverflow (top 6)
  readonly variantesSignatures = computed<SelectedBookingVariante[]>(() => {
    const list: SelectedBookingVariante[] = [];
    for (const service of this.services()) {
      if (service.statut !== false && service.variantes && service.variantes.length > 0) {
        for (const v of service.variantes) {
          if (v.statut !== false) {
            list.push({
              id: v.id,
              serviceId: service.id,
              serviceNom: service.nom,
              varianteNom: v.nom,
              dureeMinutes: v.dureeMinutes,
              prix: v.prix,
              imageUrl: v.imageUrl || service.imageUrl
            });
            if (list.length >= 6) break;
          }
        }
      }
      if (list.length >= 6) break;
    }
    return list;
  });

  // Note moyenne des avis
  readonly noteMoyenne = computed<number>(() => {
    const list = this.avis();
    if (!list || list.length === 0) return 4.9;
    const sum = list.reduce((acc, a) => acc + (a.note || 5), 0);
    return Number((sum / list.length).toFixed(1));
  });

  // Avis affichés (avec avis de fallback stylisés si backend vide)
  readonly avisAffiches = computed<AvisSalon[]>(() => {
    const raw = this.avis();
    if (raw && raw.length > 0) return raw;
    return [
      {
        id: 1,
        salonSlug: this.slugSalon,
        clientId: 101,
        clientNomComplet: 'Aïssata Traoré',
        note: 5,
        commentaire: 'Un rituel de soin d’une douceur absolue. L’équipe maîtrise l’art capillaire avec une précision rare !',
        statut: true,
        dateCreation: '2026-09-28'
      },
      {
        id: 2,
        salonSlug: this.slugSalon,
        clientId: 102,
        clientNomComplet: 'Fatou Diallo',
        note: 5,
        commentaire: 'Réservation en ligne ultra simple et prise en charge ponctuelle. Le salon est splendide et apaisant.',
        statut: true,
        dateCreation: '2026-09-25'
      },
      {
        id: 3,
        salonSlug: this.slugSalon,
        clientId: 103,
        clientNomComplet: 'Cheick Oumar',
        note: 5,
        commentaire: 'Meilleur salon de la ville pour les coupes précises et les soins profonds. Je recommande les yeux fermés.',
        statut: true,
        dateCreation: '2026-09-20'
      },
      {
        id: 4,
        salonSlug: this.slugSalon,
        clientId: 104,
        clientNomComplet: 'Mariam Konaté',
        note: 5,
        commentaire: 'Les produits de la boutique sont incroyables, mes cheveux ont retrouvé toute leur brillance naturelle.',
        statut: true,
        dateCreation: '2026-09-18'
      }
    ];
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

  ngAfterViewInit(): void {
    // Petit délai pour laisser le layout se stabiliser avant d'initialiser Leaflet
    setTimeout(() => {
      this.initLeafletMap();
    }, 400);
  }

  ngOnDestroy(): void {
    this.closeStory();
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = undefined;
    }
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
        storiesData,
        servicesData,
        produitsData,
        realisationsData,
        coiffeursData,
        avisData
      ] = await Promise.all([
        firstValueFrom(this.vitrineService.getStories(slug)).catch(() => [] as Story[]),
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

      this.stories.set(storiesData || []);
      this.services.set(servicesValides);
      this.produits.set(produitsValides.slice(0, 8)); // Top 8 produits
      this.realisations.set((realisationsData || []).slice(0, 6)); // Top 6 réalisations
      this.coiffeurs.set(coiffeursData || []);
      this.avis.set(avisData || []);
    } catch {
      // Ignorer les erreurs réseau pour laisser l'interface s'afficher
    } finally {
      this.isLoadingData.set(false);
      this.updateLeafletMarker();
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

  // =========================================================
  // GESTION DES STORIES (RUBAN & VISIONNEUSE PLEIN ÉCRAN)
  // =========================================================

  openStory(story: Story, index: number): void {
    this.selectedStory.set(story);
    this.activeStoryIndex.set(index);
    this.storyProgress.set(0);
    this.startStoryTimer();
  }

  closeStory(): void {
    this.stopStoryTimer();
    this.selectedStory.set(null);
    this.storyProgress.set(0);
  }

  nextStory(): void {
    const list = this.stories();
    const nextIdx = this.activeStoryIndex() + 1;
    if (nextIdx < list.length) {
      this.openStory(list[nextIdx], nextIdx);
    } else {
      this.closeStory();
    }
  }

  prevStory(): void {
    const list = this.stories();
    const prevIdx = this.activeStoryIndex() - 1;
    if (prevIdx >= 0) {
      this.openStory(list[prevIdx], prevIdx);
    }
  }

  pauseStory(): void {
    this.isStoryPaused.set(true);
  }

  resumeStory(): void {
    this.isStoryPaused.set(false);
  }

  private startStoryTimer(): void {
    this.stopStoryTimer();

    const duration = 5000; // 5 secondes par story
    const step = 50; // mise à jour toutes les 50ms

    this.storyProgressInterval = setInterval(() => {
      if (!this.isStoryPaused()) {
        const next = this.storyProgress() + (step / duration) * 100;
        if (next >= 100) {
          this.nextStory();
        } else {
          this.storyProgress.set(next);
        }
      }
    }, step);
  }

  private stopStoryTimer(): void {
    if (this.storyProgressInterval) {
      clearInterval(this.storyProgressInterval);
      this.storyProgressInterval = undefined;
    }
  }

  // =========================================================
  // CARTE INTERACTIVE LEAFLET (SECTION 9)
  // =========================================================

  private initLeafletMap(): void {
    if (!this.mapElement || this.leafletMap) return;

    const el = this.mapElement.nativeElement;
    const currentSalon = this.salon();

    // Coordonnées par défaut (ex: Bamako / Abidjan / Dakar si non fournies)
    const lat = currentSalon?.latitude || 12.6392;
    const lng = currentSalon?.longitude || -8.0029;

    this.leafletMap = L.map(el, {
      center: [lat, lng],
      zoom: 14,
      scrollWheelZoom: false,
      zoomControl: true
    });

    // Tuiles stylisées et douces (CartoDB Positron / OSM)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
      maxZoom: 19
    }).addTo(this.leafletMap);

    this.updateLeafletMarker();
  }

  private updateLeafletMarker(): void {
    if (!this.leafletMap) return;

    const currentSalon = this.salon();
    const lat = currentSalon?.latitude || 12.6392;
    const lng = currentSalon?.longitude || -8.0029;

    // Icône personnalisée couleur Warm Walnut & Sand Dune
    const customIcon = L.divIcon({
      className: 'salon-leaflet-marker',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #4A3B32;
          border: 3px solid #C8B6A6;
          box-shadow: 0 4px 14px rgba(74, 59, 50, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FAF8F5;
        ">
          <span class="material-icons" style="font-size: 20px;">spa</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.leafletMap);
    const nom = currentSalon?.nom || 'Notre Salon';
    const adresse = currentSalon?.adresse || 'Adresse du salon';

    marker.bindPopup(`
      <div style="font-family: inherit; padding: 6px 2px; text-align: center;">
        <strong style="color: #4A3B32; font-size: 14px;">${nom}</strong>
        <p style="margin: 4px 0 0 0; color: #66605B; font-size: 12px;">${adresse}</p>
      </div>
    `);

    this.leafletMap.setView([lat, lng], 14);
  }

  openGoogleMaps(): void {
    const s = this.salon();
    if (!s) return;
    let url = `https://www.google.com/maps/search/?api=1&query=`;
    if (s.latitude && s.longitude) {
      url += `${s.latitude},${s.longitude}`;
    } else {
      url += encodeURIComponent(`${s.nom} ${s.adresse || ''}`);
    }
    window.open(url, '_blank');
  }

  openBookingDrawer(): void {
    this.bookingStore.openDrawer();
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
