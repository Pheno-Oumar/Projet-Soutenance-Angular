import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  inject, signal, computed, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { ExploreService } from '../../../../core/services/explore.service';
import { MediaProxyService } from '../../../../core/services/media-proxy.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PanierService } from '../../../../core/services/panier.service';
import { ClientSalonService } from '../../../../core/services/client-salon.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { GuestStorageService } from '../../../../core/services/guest-storage.service';
import { IMAGE_CATALOG } from '../../../../shared/constants/image-catalog.constants';
import {
  Salon, PrestationCatalogue, CategorieProduit, HoraireOuverture,
  VarianteServiceDto, Produit, CreneauDisponible, RendezVous, Commande,
  RendezVousCreateDto
} from '../../../../shared/models';

export interface SelectedVariante {
  varianteId: number;
  varianteNom: string;
  serviceNom: string;
  dureeMinutes: number;
  prix: number;
}

import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-explore-salon-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterModule],
  templateUrl: './explore-salon-drawer.component.html',
  styleUrls: ['./explore-salon-drawer.component.css']
})
export class ExploreSalonDrawerComponent implements OnChanges, AfterViewInit {
  @Input() salon: Salon | null = null;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() salonChanged = new EventEmitter<Salon>();

  private readonly vitrineService = inject(VitrineService);
  private readonly exploreService = inject(ExploreService);
  private readonly mediaProxy = inject(MediaProxyService);
  private readonly notificationService = inject(NotificationService);
  private readonly clientSalonService = inject(ClientSalonService);
  readonly authService = inject(AuthService);
  private readonly guestStorage = inject(GuestStorageService);
  private readonly router = inject(Router);
  readonly panierService = inject(PanierService);
  private readonly el = inject(ElementRef);

  // ─── State ───
  readonly activeTab = signal<'services' | 'boutique'>('services');
  readonly loading = signal(true);
  readonly services = signal<PrestationCatalogue[]>([]);
  readonly categories = signal<CategorieProduit[]>([]);
  readonly horaires = signal<HoraireOuverture[]>([]);
  readonly salonDetail = signal<Salon | null>(null);
  readonly showInfoPanel = signal(true);

  // ─── Sub-drawer state ───
  readonly activeService = signal<PrestationCatalogue | null>(null);
  readonly activeCategorie = signal<CategorieProduit | null>(null);
  readonly categorieProduits = signal<Produit[]>([]);
  readonly loadingProduits = signal(false);
  readonly showRdvRecap = signal(false);
  readonly showPanierDrawer = signal(false);

  // ─── RDV selection & wizard ───
  readonly selectedVariantes = signal<SelectedVariante[]>([]);
  readonly rdvTotalPrix = computed(() =>
    this.selectedVariantes().reduce((sum, v) => sum + v.prix, 0)
  );
  readonly rdvTotalDuree = computed(() =>
    this.selectedVariantes().reduce((sum, v) => sum + v.dureeMinutes, 0)
  );

  readonly bookingDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly availableSlots = signal<CreneauDisponible[]>([]);
  readonly loadingSlots = signal(false);
  readonly selectedSlot = signal<CreneauDisponible | null>(null);
  readonly bookingNotes = signal<string>('');
  readonly submittingBooking = signal(false);
  readonly confirmedRdv = signal<RendezVous | null>(null);
  readonly activeSlotPeriod = signal<'TOUS' | 'MATIN' | 'APRES_MIDI' | 'SOIR'>('TOUS');

  readonly filteredSlots = computed(() => {
    const slots = this.availableSlots();
    const period = this.activeSlotPeriod();
    if (period === 'TOUS') return slots;
    return slots.filter(s => {
      const h = parseInt(s.heureDebut.split(':')[0], 10);
      if (period === 'MATIN') return h < 12;
      if (period === 'APRES_MIDI') return h >= 12 && h < 17;
      if (period === 'SOIR') return h >= 17;
      return true;
    });
  });

  // ─── Order flow state ───
  readonly submittingCommande = signal(false);
  readonly confirmedCommande = signal<Commande | null>(null);

  // ─── Parallax ───
  private drawerScrollY = 0;

  readonly IMAGE_CATALOG = IMAGE_CATALOG;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['salon'] && this.salon) {
      this.loadSalonData(this.salon.slug);
    }
    if (changes['isOpen'] && this.isOpen) {
      document.body.style.overflow = 'hidden';
    }
    if (changes['isOpen'] && !this.isOpen) {
      document.body.style.overflow = '';
    }
  }

  ngAfterViewInit(): void {
    // Parallax on drawer scroll
  }

  // ══════════════════════════════════════════════
  //  DATA LOADING
  // ══════════════════════════════════════════════

  private loadSalonData(slug: string): void {
    this.loading.set(true);
    this.activeTab.set('services');
    this.activeService.set(null);
    this.activeCategorie.set(null);
    this.showRdvRecap.set(false);
    this.showPanierDrawer.set(false);
    this.selectedVariantes.set([]);
    this.availableSlots.set([]);
    this.selectedSlot.set(null);
    this.confirmedRdv.set(null);
    this.confirmedCommande.set(null);
    this.bookingNotes.set('');

    // Load salon details
    this.exploreService.getSalonDetail(slug).subscribe({
      next: (detail) => this.salonDetail.set(detail),
      error: () => {}
    });

    // Load services
    this.vitrineService.getServices(slug).subscribe({
      next: (svc) => {
        this.services.set(
          (svc || []).filter((s) => s.statut && s.variantes && s.variantes.some((v) => v.statut !== false))
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    // Load product categories
    this.vitrineService.getCategoriesProduits(slug).subscribe({
      next: (cats) =>
        this.categories.set(
          (cats || []).filter(
            (c) =>
              c.statut &&
              ((c.nombreProduits !== undefined && c.nombreProduits > 0) ||
                (c.produits && c.produits.some((p) => p.statut)))
          )
        ),
      error: () => {}
    });

    // Load horaires
    this.vitrineService.getHoraires(slug).subscribe({
      next: (h) => this.horaires.set(h),
      error: () => {}
    });

    // Init panier
    this.panierService.chargerPanier(slug);
  }

  // ══════════════════════════════════════════════
  //  MEDIA HELPERS
  // ══════════════════════════════════════════════

  resolveCover(salon: Salon): string {
    const raw = (salon.coverUrl && salon.coverUrl.trim().length > 5)
      ? salon.coverUrl
      : IMAGE_CATALOG.salons.luxuryCover1;
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveLogo(salon: Salon): string {
    const raw = (salon.logoUrl && salon.logoUrl.trim().length > 5)
      ? salon.logoUrl
      : IMAGE_CATALOG.salons.defaultLogo;
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveServiceImage(svc: PrestationCatalogue, index: number): string {
    if (svc.imageUrl && svc.imageUrl.trim().length > 5) {
      return this.mediaProxy.getSafeMediaUrl(svc.imageUrl);
    }
    const fallbacks = [
      IMAGE_CATALOG.services.tresses,
      IMAGE_CATALOG.services.balayageMiel,
      IMAGE_CATALOG.services.soinBotox,
      IMAGE_CATALOG.services.fadeBarber,
      IMAGE_CATALOG.services.coupeFemme,
      IMAGE_CATALOG.services.brushing
    ];
    return this.mediaProxy.getSafeMediaUrl(fallbacks[index % fallbacks.length]);
  }

  resolveCategorieImage(cat: CategorieProduit, index: number): string {
    if (cat.imageUrl && cat.imageUrl.trim().length > 5) {
      return this.mediaProxy.getSafeMediaUrl(cat.imageUrl);
    }
    const fallbacks = [
      IMAGE_CATALOG.services.soinBotox,
      IMAGE_CATALOG.services.lissageTanin,
      IMAGE_CATALOG.services.soinVapeur
    ];
    return this.mediaProxy.getSafeMediaUrl(fallbacks[index % fallbacks.length]);
  }

  resolveProduitImage(p: Produit, index: number): string {
    if (p.imageUrl && p.imageUrl.trim().length > 5) {
      return this.mediaProxy.getSafeMediaUrl(p.imageUrl);
    }
    return this.mediaProxy.getSafeMediaUrl(IMAGE_CATALOG.services.soinBotox);
  }

  // ══════════════════════════════════════════════
  //  TAB SWITCH
  // ══════════════════════════════════════════════

  switchTab(tab: 'services' | 'boutique'): void {
    this.activeTab.set(tab);
    this.activeService.set(null);
    this.activeCategorie.set(null);
  }

  // ══════════════════════════════════════════════
  //  SERVICE DETAIL (sub-drawer)
  // ══════════════════════════════════════════════

  openServiceDetail(service: PrestationCatalogue): void {
    this.activeService.set(service);
  }

  closeServiceDetail(): void {
    this.activeService.set(null);
  }

  // ══════════════════════════════════════════════
  //  VARIANTES → RDV
  // ══════════════════════════════════════════════

  isVarianteSelected(varianteId: number): boolean {
    return this.selectedVariantes().some(v => v.varianteId === varianteId);
  }

  toggleVariante(variante: VarianteServiceDto, serviceNom: string): void {
    const exists = this.selectedVariantes().find(v => v.varianteId === variante.id);
    if (exists) {
      this.selectedVariantes.update(list => list.filter(v => v.varianteId !== variante.id));
      this.notificationService.info(`${variante.nom} retiré du rendez-vous`);
    } else {
      const item: SelectedVariante = {
        varianteId: variante.id,
        varianteNom: variante.nom,
        serviceNom,
        dureeMinutes: variante.dureeMinutes,
        prix: variante.prix
      };
      this.selectedVariantes.update(list => [...list, item]);
      this.notificationService.success(`${variante.nom} ajouté au rendez-vous`);
    }
    if (this.showRdvRecap()) {
      this.chargerCreneauxDisponibles();
    }
  }

  removeVariante(varianteId: number): void {
    this.selectedVariantes.update(list => list.filter(v => v.varianteId !== varianteId));
    if (this.showRdvRecap()) {
      this.chargerCreneauxDisponibles();
    }
  }

  openRdvRecap(): void {
    this.showRdvRecap.set(true);
    this.confirmedRdv.set(null);
    this.chargerCreneauxDisponibles();
  }

  closeRdvRecap(): void {
    this.showRdvRecap.set(false);
    this.confirmedRdv.set(null);
  }

  clearRdvSelection(): void {
    this.selectedVariantes.set([]);
    this.availableSlots.set([]);
    this.selectedSlot.set(null);
    this.showRdvRecap.set(false);
    this.confirmedRdv.set(null);
  }

  // ══════════════════════════════════════════════
  //  CRENEAUX & DATE SELECTION
  // ══════════════════════════════════════════════

  getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  getDateOffsetString(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  }

  selectBookingDate(dateStr: string): void {
    this.bookingDate.set(dateStr);
    this.selectedSlot.set(null);
    this.chargerCreneauxDisponibles();
  }

  setSlotPeriod(period: 'TOUS' | 'MATIN' | 'APRES_MIDI' | 'SOIR'): void {
    this.activeSlotPeriod.set(period);
  }

  selectSlot(slot: CreneauDisponible): void {
    this.selectedSlot.set(slot);
  }

  chargerCreneauxDisponibles(): void {
    const s = this.salon;
    const date = this.bookingDate();
    const vIds = this.selectedVariantes().map(v => v.varianteId);

    if (!s || vIds.length === 0 || !date) {
      this.availableSlots.set([]);
      return;
    }

    this.loadingSlots.set(true);
    this.selectedSlot.set(null);

    this.vitrineService.getDisponibilites(s.slug, {
      date,
      varianteIds: vIds
    }).subscribe({
      next: (slots) => {
        this.availableSlots.set(slots || []);
        this.loadingSlots.set(false);
      },
      error: () => {
        this.availableSlots.set([]);
        this.loadingSlots.set(false);
      }
    });
  }

  confirmerRendezVous(): void {
    const s = this.salon;
    if (!s) return;

    if (this.selectedVariantes().length === 0) {
      this.notificationService.error('Veuillez sélectionner au moins une prestation.');
      return;
    }

    const slot = this.selectedSlot();
    if (!slot) {
      this.notificationService.error('Veuillez sélectionner un créneau horaire.');
      return;
    }

    const timeParts = slot.heureDebut.split(':');
    const hh = (timeParts[0] || '00').padStart(2, '0');
    const mm = (timeParts[1] || '00').padStart(2, '0');
    const ss = (timeParts[2] || '00').padStart(2, '0');
    const dateHeure = `${this.bookingDate()}T${hh}:${mm}:${ss}`;
    const serviceIds = this.selectedVariantes().map(v => v.varianteId);

    if (!this.authService.isAuthenticated()) {
      this.guestStorage.sauvegarderReservationEnCours({
        slugSalon: s.slug,
        dateHeure,
        varianteIds: serviceIds,
        coiffeurId: slot.coiffeurId || undefined,
        notes: this.bookingNotes()
      });
      this.notificationService.info(
        'Votre sélection a été sauvegardée. Connectez-vous à votre espace client pour finaliser la réservation.'
      );
      this.close();
      this.router.navigate(['/' + s.slug + '/login']);
      return;
    }

    this.submittingBooking.set(true);
    const request: RendezVousCreateDto = {
      dateHeurePrevue: dateHeure,
      dateHeure,
      varianteIds: serviceIds,
      serviceIds,
      coiffeurId: slot.coiffeurId || undefined,
      notes: this.bookingNotes()
    };

    this.clientSalonService.reserverRendezVous(s.slug, request).subscribe({
      next: (rdv) => {
        this.submittingBooking.set(false);
        this.confirmedRdv.set(rdv);
        this.notificationService.success('Votre rendez-vous a été confirmé avec succès !');
      },
      error: (err: any) => {
        this.submittingBooking.set(false);
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la réservation de votre créneau.'
        );
      }
    });
  }

  goToClientRendezVous(): void {
    const s = this.salon;
    if (!s) return;
    this.close();
    this.router.navigate(['/' + s.slug + '/client']);
  }

  resetBookingAfterSuccess(): void {
    this.confirmedRdv.set(null);
    this.selectedVariantes.set([]);
    this.selectedSlot.set(null);
    this.showRdvRecap.set(false);
  }

  // ══════════════════════════════════════════════
  //  CATÉGORIE PRODUITS (sub-drawer)
  // ══════════════════════════════════════════════

  openCategorieDetail(cat: CategorieProduit): void {
    this.activeCategorie.set(cat);
    this.loadingProduits.set(true);

    if (cat.produits && cat.produits.length > 0) {
      this.categorieProduits.set(cat.produits.filter(p => p.statut));
      this.loadingProduits.set(false);
    } else if (this.salon) {
      this.vitrineService.getProduits(this.salon.slug, cat.id).subscribe({
        next: (prods) => {
          this.categorieProduits.set(prods.filter(p => p.statut));
          this.loadingProduits.set(false);
        },
        error: () => this.loadingProduits.set(false)
      });
    }
  }

  closeCategorieDetail(): void {
    this.activeCategorie.set(null);
    this.categorieProduits.set([]);
  }

  // ══════════════════════════════════════════════
  //  PANIER & COMMANDE
  // ══════════════════════════════════════════════

  ajouterProduitPanier(produit: Produit): void {
    if (!this.salon) return;
    this.panierService.ajouterArticle(this.salon.slug, {
      id: produit.id,
      nom: produit.nom,
      prixVente: produit.prixVente,
      imageUrl: produit.imageUrl,
      quantiteDisponible: produit.stock?.quantiteDisponible
    });
  }

  togglePanierDrawer(): void {
    this.showPanierDrawer.update(v => !v);
    this.confirmedCommande.set(null);
  }

  modifierQuantitePanier(produitId: number, quantite: number): void {
    if (!this.salon) return;
    this.panierService.modifierQuantite(this.salon.slug, produitId, quantite);
  }

  supprimerArticlePanier(produitId: number): void {
    if (!this.salon) return;
    this.panierService.supprimerArticle(this.salon.slug, produitId);
  }

  passerCommandePanier(): void {
    const s = this.salon;
    if (!s) return;

    if (!this.panierService.panier()?.lignes?.length) {
      this.notificationService.warning('Votre panier est vide.');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.notificationService.info('Veuillez vous connecter pour valider votre commande Click & Collect.');
      this.close();
      this.router.navigate(['/' + s.slug + '/login']);
      return;
    }

    this.submittingCommande.set(true);
    this.clientSalonService.passerCommande(s.slug).subscribe({
      next: (commande) => {
        this.submittingCommande.set(false);
        this.confirmedCommande.set(commande);
        this.notificationService.success(
          `Commande #${commande.id} confirmée ! Code de retrait : ${commande.codeRetrait || 'Au comptoir'}`
        );
      },
      error: (err: any) => {
        this.submittingCommande.set(false);
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la validation de votre commande.'
        );
      }
    });
  }

  goToClientCommandes(): void {
    const s = this.salon;
    if (!s) return;
    this.close();
    this.router.navigate(['/' + s.slug + '/client']);
  }

  resetCommandeAfterSuccess(): void {
    this.confirmedCommande.set(null);
    this.showPanierDrawer.set(false);
  }

  // ══════════════════════════════════════════════
  //  ITINÉRAIRE
  // ══════════════════════════════════════════════

  openItinerary(): void {
    const s = this.salonDetail() || this.salon;
    if (!s) return;
    if (s.latitude && s.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`,
        '_blank'
      );
    } else if (s.adresse) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.adresse)}`,
        '_blank'
      );
    } else {
      this.notificationService.warning('Aucune adresse disponible pour ce salon');
    }
  }

  // ══════════════════════════════════════════════
  //  3D TILT
  // ══════════════════════════════════════════════

  onCardTilt(event: MouseEvent, card: HTMLElement): void {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rx = ((y - rect.height / 2) / (rect.height / 2)) * -4;
    const ry = ((x - rect.width / 2) / (rect.width / 2)) * 4;
    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    const glow = card.querySelector('.card-glow') as HTMLElement;
    if (glow) {
      glow.style.opacity = '1';
      glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(200,182,166,0.25), transparent 55%)`;
    }
  }

  onCardTiltReset(card: HTMLElement): void {
    card.style.transform = '';
    const glow = card.querySelector('.card-glow') as HTMLElement;
    if (glow) glow.style.opacity = '0';
  }

  // ══════════════════════════════════════════════
  //  DRAWER SCROLL PARALLAX
  // ══════════════════════════════════════════════

  onDrawerScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.drawerScrollY = target.scrollTop;
    const cover = this.el.nativeElement.querySelector('.drawer-cover-img') as HTMLElement;
    if (cover) {
      cover.style.transform = `translateY(${this.drawerScrollY * 0.35}px) scale(1.05)`;
    }
    const logo = this.el.nativeElement.querySelector('.drawer-salon-logo') as HTMLElement;
    if (logo) {
      const scale = Math.max(0.6, 1 - this.drawerScrollY / 600);
      logo.style.transform = `scale(${scale})`;
    }
  }

  // ══════════════════════════════════════════════
  //  HORAIRES HELPER
  // ══════════════════════════════════════════════

  isOpenToday(): boolean {
    const joursFr = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
    const today = joursFr[new Date().getDay()];
    return this.horaires().some(h => h.jourSemaine === today && h.actif !== false);
  }

  getTodayHoraire(): string {
    const joursFr = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
    const today = joursFr[new Date().getDay()];
    const h = this.horaires().find(ho => ho.jourSemaine === today && ho.actif !== false);
    if (!h) return 'Fermé';
    return `${h.heureOuverture?.substring(0, 5)} – ${h.heureFermeture?.substring(0, 5)}`;
  }

  getServicePriceRange(svc: PrestationCatalogue): string {
    if (!svc.variantes || svc.variantes.length === 0) {
      return svc.prix ? `${svc.prix.toLocaleString()} FCFA` : '';
    }
    const prices = svc.variantes.filter(v => v.statut).map(v => v.prix);
    if (prices.length === 0) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `${min.toLocaleString()} FCFA`;
    return `${min.toLocaleString()} – ${max.toLocaleString()} FCFA`;
  }

  getServiceVarianteCount(svc: PrestationCatalogue): number {
    return svc.variantes?.filter(v => v.statut).length || 0;
  }

  // ══════════════════════════════════════════════
  //  CLOSE
  // ══════════════════════════════════════════════

  close(): void {
    document.body.style.overflow = '';
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('drawer-backdrop')) {
      this.close();
    }
  }
}
