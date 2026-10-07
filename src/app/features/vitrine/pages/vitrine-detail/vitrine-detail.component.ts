import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { PanierService } from '../../../../core/services/panier.service';
import { GuestStorageService } from '../../../../core/services/guest-storage.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ClientSalonService } from '../../../../core/services/client-salon.service';
import { MediaProxyService } from '../../../../core/services/media-proxy.service';
import {
  Salon,
  PrestationCatalogue,
  CategorieProduit,
  Produit,
  ProfilCoiffeur,
  AvisSalon,
  Realisation,
  Story,
  CreneauDisponible,
  VarianteServiceDto,
  SalonStories,
  Commande,
  HoraireOuverture,
  RendezVousCreateDto
} from '../../../../shared/models';
import { StoryViewerModalComponent } from '../../../kadys/components/story-viewer-modal/story-viewer-modal.component';
import { SalonNavbarComponent } from '../../components/salon-navbar/salon-navbar.component';
import { SalonFooterComponent } from '../../components/salon-footer/salon-footer.component';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import {
  IMAGE_CATALOG,
  getServiceImage,
  getProductCategoryImage,
  getProductImage,
  getVarianteImage
} from '../../../../shared/constants/image-catalog.constants';

import { MatIconModule } from '@angular/material/icon';

export type VitrineTab = 'PRESTATIONS' | 'BOUTIQUE' | 'COIFFEURS' | 'AVIS' | 'GALERIE';

@Component({
  selector: 'app-vitrine-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    StoryViewerModalComponent,
    SalonNavbarComponent,
    SalonFooterComponent,
    SafeMediaUrlPipe,
    MatIconModule
  ],
  templateUrl: './vitrine-detail.component.html',
  styleUrls: ['./vitrine-detail.component.css']
})
export class VitrineDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vitrineService = inject(VitrineService);
  readonly panierService = inject(PanierService);
  private readonly guestStorage = inject(GuestStorageService);
  private readonly notificationService = inject(NotificationService);
  readonly authService = inject(AuthService);
  private readonly clientSalonService = inject(ClientSalonService);
  private readonly mediaProxy = inject(MediaProxyService);

  slugSalon = '';
  readonly activeTab = signal<VitrineTab>('PRESTATIONS');
  readonly salon = signal<Salon | null>(null);
  readonly services = signal<PrestationCatalogue[]>([]);
  readonly categoriesProduits = signal<CategorieProduit[]>([]);
  readonly produits = signal<Produit[]>([]);
  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly avis = signal<AvisSalon[]>([]);
  readonly horaires = signal<HoraireOuverture[]>([]);
  readonly realisations = signal<Realisation[]>([]);
  readonly stories = signal<Story[]>([]);
  readonly chargement = signal<boolean>(true);

  // Filtre services
  selectedServiceCategory: string = 'TOUS';
  serviceSearchQuery: string = '';

  // Filtre produits
  selectedCategoryProduitId: number | null = null;

  // Stories modal
  activeSalonStory: SalonStories | null = null;

  // Cart Drawer
  cartDrawerOpen = false;

  // Booking Wizard
  bookingModalOpen = false;
  selectedVariantes: VarianteServiceDto[] = [];
  selectedDate: string = new Date().toISOString().split('T')[0];
  selectedCoiffeurId: number | null = null;
  selectedCreneau: CreneauDisponible | null = null;
  availableSlots: CreneauDisponible[] = [];
  loadingSlots = false;
  bookingNotes = '';
  submittingBooking = false;

  // Review Modal
  reviewModalOpen = false;
  reviewNote = 5;
  reviewComment = '';
  submittingReview = false;

  // Lightbox Galerie
  activeLightboxRealisation: Realisation | null = null;

  // Scroll to top FAB
  showScrollTop = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.showScrollTop = window.scrollY > 350;
    }
  }

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openLightbox(real: Realisation): void {
    this.activeLightboxRealisation = real;
  }

  closeLightbox(): void {
    this.activeLightboxRealisation = null;
  }

  get isSalonFavorite(): boolean {
    return this.guestStorage.isSalonFavori(this.slugSalon);
  }

  readonly totalDureeEstimee = computed(() => {
    return this.selectedVariantes.reduce((acc, v) => acc + (v.dureeMinutes || 0), 0);
  });

  readonly totalPrixEstime = computed(() => {
    return this.selectedVariantes.reduce((acc, v) => acc + (v.prix || 0), 0);
  });

  readonly moyenneAvis = computed(() => {
    const list = this.avis();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, a) => acc + (a.note || 5), 0);
    return sum / list.length;
  });

  readonly horairesAujourdhui = computed(() => {
    const list = this.horaires();
    if (!list || list.length === 0) return '09:00 - 19:30';
    const days = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
    const today = days[new Date().getDay()];
    const h = list.find((item) => item.jourSemaine === today);
    if (!h || !h.actif) return 'Fermé aujourd\'hui';
    const ouv = h.heureOuverture ? h.heureOuverture.substring(0, 5) : '09:00';
    const ferm = h.heureFermeture ? h.heureFermeture.substring(0, 5) : '19:30';
    return `${ouv} - ${ferm}`;
  });

  // Services filtrés
  get filteredServices(): PrestationCatalogue[] {
    let list = this.services().filter(
      (s) => s.statut && s.variantes && s.variantes.some((v) => v.statut !== false)
    );
    if (this.selectedServiceCategory !== 'TOUS') {
      const cat = this.selectedServiceCategory.toLowerCase();
      list = list.filter((s) => {
        const nom = (s.nom || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        if (cat === 'tresses') return nom.includes('tresse') || nom.includes('natte') || nom.includes('braid') || nom.includes('lock');
        if (cat === 'coupes') return nom.includes('coupe') || nom.includes('brushing') || nom.includes('coiff');
        if (cat === 'colorations') return nom.includes('color') || nom.includes('balayage') || nom.includes('mèche') || nom.includes('blond');
        if (cat === 'soins') return nom.includes('soin') || nom.includes('botox') || nom.includes('lissage') || nom.includes('kératine');
        if (cat === 'barbe') return nom.includes('barbe') || nom.includes('rasage') || nom.includes('homme') || nom.includes('barber');
        return true;
      });
    }
    if (this.serviceSearchQuery.trim()) {
      const q = this.serviceSearchQuery.toLowerCase();
      list = list.filter(
        (s) => (s.nom || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  // Produits filtrés
  get filteredProduits(): Produit[] {
    const prods = this.produits().filter((p) => p.statut);
    if (this.selectedCategoryProduitId === null) {
      return prods;
    }
    return prods.filter((p) => p.categorieId === this.selectedCategoryProduitId);
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slugSalon');
      if (slug) {
        this.slugSalon = slug;
        this.guestStorage.enregistrerConsultationSalon(slug);
        this.panierService.chargerPanier(slug);
        this.chargerDonneesVitrine();
      }
    });

    // Check query params (?rdv=true)
    this.route.queryParamMap.subscribe((q) => {
      if (q.has('rdv')) {
        this.activeTab.set('PRESTATIONS');
        this.openBookingWizard();
      }
    });
  }

  chargerDonneesVitrine(): void {
    this.chargement.set(true);

    this.vitrineService.getInfosSalon(this.slugSalon).subscribe({
      next: (data) => {
        this.salon.set(data);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
      }
    });

    this.vitrineService.getServices(this.slugSalon).subscribe({
      next: (list) =>
        this.services.set(
          (list || []).filter(
            (s) => s.statut && s.variantes && s.variantes.some((v) => v.statut !== false)
          )
        ),
      error: () => {}
    });

    this.vitrineService.getCategoriesProduits(this.slugSalon).subscribe({
      next: (list) =>
        this.categoriesProduits.set(
          (list || []).filter(
            (c) =>
              c.statut &&
              ((c.nombreProduits !== undefined && c.nombreProduits > 0) ||
                (c.produits && c.produits.some((p) => p.statut)))
          )
        ),
      error: () => {}
    });

    this.vitrineService.getProduits(this.slugSalon).subscribe({
      next: (list) => this.produits.set((list || []).filter((p) => p.statut)),
      error: () => {}
    });

    this.vitrineService.getCoiffeurs(this.slugSalon).subscribe({
      next: (list) => this.coiffeurs.set(list),
      error: () => {}
    });

    this.vitrineService.getAvis(this.slugSalon).subscribe({
      next: (list) => this.avis.set(list),
      error: () => {}
    });

    this.vitrineService.getRealisations(this.slugSalon).subscribe({
      next: (list) => this.realisations.set(list),
      error: () => {}
    });

    this.vitrineService.getStories(this.slugSalon).subscribe({
      next: (list) => this.stories.set(list),
      error: () => {}
    });

    this.vitrineService.getHoraires(this.slugSalon).subscribe({
      next: (list) => this.horaires.set(list),
      error: () => {}
    });
  }

  // --- HELPERS IMAGES ---
  resolveCoverUrl(salon: Salon | null): string {
    const raw = salon?.coverUrl || IMAGE_CATALOG.salons.luxuryCover1;
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveServiceImage(s: PrestationCatalogue): string {
    const raw = getServiceImage(s.nom, s.imageUrl);
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveVarianteImage(v: VarianteServiceDto): string {
    const raw = getVarianteImage(v.nom, v.imageUrl);
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveCategoryImage(cat: CategorieProduit): string {
    const raw = getProductCategoryImage(cat.nom, (cat as any).imageUrl);
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveProduitImage(p: Produit): string {
    const raw = getProductImage(p.nom, p.imageUrl);
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveCoiffeurPhoto(index: number, photoUrl?: string): string {
    if (photoUrl && photoUrl.trim().length > 5) {
      return this.mediaProxy.getSafeMediaUrl(photoUrl);
    }
    const raw = IMAGE_CATALOG.coiffeurs[index % IMAGE_CATALOG.coiffeurs.length];
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveAvatar(index: number): string {
    const raw = IMAGE_CATALOG.avatars[index % IMAGE_CATALOG.avatars.length];
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveRealisationMedia(real: Realisation): string {
    const raw = real.urlVideo || getServiceImage(real.titre);
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  getServiceTag(service: PrestationCatalogue): string {
    if ((service as any).categorieNom) return (service as any).categorieNom;
    const nom = (service.nom || '').toLowerCase();
    if (nom.includes('tresse') || nom.includes('natte') || nom.includes('braid') || nom.includes('lock')) return 'Tresses & Nattes';
    if (nom.includes('color') || nom.includes('balayage') || nom.includes('mèche') || nom.includes('blond')) return 'Coloration & Mèches';
    if (nom.includes('soin') || nom.includes('botox') || nom.includes('lissage') || nom.includes('kératine')) return 'Soin & Spa';
    if (nom.includes('barbe') || nom.includes('barber') || nom.includes('rasage')) return 'Barbershop';
    if (nom.includes('coupe') || nom.includes('brushing')) return 'Coupe & Brushing';
    return 'Prestation Signature';
  }

  getCoiffeurRating(coiffeur: ProfilCoiffeur, index: number): string {
    const ratings = ['4.95 (Expert)', '5.0 (Top Artiste)', '4.9 (Styliste)', '4.85 (Coloriste)'];
    return ratings[index % ratings.length];
  }

  toggleFavorite(): void {
    const isFav = this.guestStorage.toggleSalonFavori(this.slugSalon);
    if (isFav) {
      this.notificationService.success('Salon ajouté à vos favoris');
    } else {
      this.notificationService.info('Salon retiré de vos favoris');
    }
  }

  openStoryViewer(): void {
    const s = this.salon();
    if (!s || this.stories().length === 0) return;

    this.activeSalonStory = {
      salonId: s.id,
      salonNom: s.nom,
      salonSlug: s.slug,
      salonLogoUrl: s.logoUrl,
      nombreStories: this.stories().length,
      stories: this.stories()
    };
  }

  closeStoryViewer(): void {
    this.activeSalonStory = null;
  }

  // --- PANIER CLICK & COLLECT ---
  ajouterProduitAuPanier(produit: Produit): void {
    this.panierService.ajouterArticle(this.slugSalon, produit, 1);
  }

  toggleCartDrawer(): void {
    this.cartDrawerOpen = !this.cartDrawerOpen;
  }

  passerCommandePanier(): void {
    if (!this.authService.isAuthenticated()) {
      this.notificationService.info('Veuillez vous connecter pour valider votre commande Click & Collect.');
      this.router.navigate(['/' + this.slugSalon + '/login']);
      return;
    }

    this.clientSalonService.passerCommande(this.slugSalon).subscribe({
      next: (commande: Commande) => {
        this.notificationService.success(
          `Commande Click & Collect #${commande.id} confirmée ! Code de retrait : ${commande.codeRetrait || 'A fournir au comptoir'}`
        );
        this.cartDrawerOpen = false;
        this.router.navigate(['/' + this.slugSalon + '/client']);
      },
      error: (err: any) => {
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la validation de votre commande.'
        );
      }
    });
  }

  // --- BOOKING WIZARD ---
  openBookingWizard(preselectedService?: PrestationCatalogue, preselectedVariante?: VarianteServiceDto): void {
    this.bookingModalOpen = true;
    if (preselectedVariante) {
      this.selectedVariantes = [preselectedVariante];
    } else if (preselectedService && preselectedService.variantes && preselectedService.variantes.length > 0) {
      this.selectedVariantes = [preselectedService.variantes[0]];
    }
    this.chargerCreneauxDisponibles();
  }

  closeBookingWizard(): void {
    this.bookingModalOpen = false;
  }

  isVarianteSelected(variante: VarianteServiceDto): boolean {
    return this.selectedVariantes.some((v) => v.id === variante.id);
  }

  toggleVarianteSelection(variante: VarianteServiceDto): void {
    const index = this.selectedVariantes.findIndex((v) => v.id === variante.id);
    if (index >= 0) {
      this.selectedVariantes.splice(index, 1);
    } else {
      this.selectedVariantes.push(variante);
    }
    this.chargerCreneauxDisponibles();
  }

  chargerCreneauxDisponibles(): void {
    if (this.selectedVariantes.length === 0 || !this.selectedDate) {
      this.availableSlots = [];
      return;
    }

    this.loadingSlots = true;
    this.selectedCreneau = null;
    const varianteIds = this.selectedVariantes.map((v) => v.id);

    this.vitrineService.getDisponibilites(this.slugSalon, {
      date: this.selectedDate,
      varianteIds
    }).subscribe({
      next: (slots) => {
        this.availableSlots = slots;
        this.loadingSlots = false;
      },
      error: () => {
        this.availableSlots = [];
        this.loadingSlots = false;
      }
    });
  }

  onDateChange(): void {
    this.chargerCreneauxDisponibles();
  }

  selectCreneau(slot: CreneauDisponible): void {
    this.selectedCreneau = slot;
  }

  confirmerRendezVous(): void {
    if (this.selectedVariantes.length === 0) {
      this.notificationService.error('Veuillez sélectionner au moins une prestation.');
      return;
    }
    if (!this.selectedCreneau) {
      this.notificationService.error('Veuillez sélectionner un créneau horaire.');
      return;
    }

    const timeParts = this.selectedCreneau.heureDebut.split(':');
    const hh = (timeParts[0] || '00').padStart(2, '0');
    const mm = (timeParts[1] || '00').padStart(2, '0');
    const ss = (timeParts[2] || '00').padStart(2, '0');
    const dateHeure = `${this.selectedDate}T${hh}:${mm}:${ss}`;

    // Si le visiteur n'est pas connecté, enregistrer le pending booking et rediriger vers le login salon
    if (!this.authService.isAuthenticated()) {
      this.guestStorage.sauvegarderReservationEnCours({
        slugSalon: this.slugSalon,
        dateHeure,
        varianteIds: this.selectedVariantes.map((v) => v.id),
        coiffeurId: this.selectedCoiffeurId || undefined,
        notes: this.bookingNotes
      });
      this.notificationService.info('Veuillez vous connecter à votre espace salon pour finaliser votre réservation.');
      this.router.navigate(['/' + this.slugSalon + '/login']);
      return;
    }

    this.submittingBooking = true;
    const request: RendezVousCreateDto = {
      dateHeurePrevue: dateHeure,
      dateHeure,
      varianteIds: this.selectedVariantes.map((v) => v.id),
      serviceIds: this.selectedVariantes.map((v) => v.id),
      coiffeurId: this.selectedCoiffeurId || undefined,
      notes: this.bookingNotes
    };

    this.clientSalonService.reserverRendezVous(this.slugSalon, request).subscribe({
      next: () => {
        this.submittingBooking = false;
        this.bookingModalOpen = false;
        this.notificationService.success('Votre rendez-vous a été confirmé avec succès !');
        this.router.navigate(['/' + this.slugSalon + '/client']);
      },
      error: (err: any) => {
        this.submittingBooking = false;
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la réservation de votre créneau.'
        );
      }
    });
  }
}
