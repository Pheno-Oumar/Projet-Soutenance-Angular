import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { SalonBookingStore } from '../../state/salon-booking.store';
import { PrestationCatalogue, VarianteServiceDto, ProfilCoiffeur } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { NotificationService } from '../../../../core/services/notification.service';
import { FlyToTargetService } from '../../interactions/fly-to-target.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-salon-service-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, SafeMediaUrlPipe],
  templateUrl: './salon-service-detail.component.html',
  styleUrl: './salon-service-detail.component.css'
})
export class SalonServiceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vitrineService = inject(VitrineService);
  private readonly notificationService = inject(NotificationService);
  readonly contextStore = inject(SalonContextStore);
  readonly bookingStore = inject(SalonBookingStore);
  readonly flyToTargetService = inject(FlyToTargetService);

  readonly service = signal<PrestationCatalogue | null>(null);
  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly selectedCoiffeurId = signal<number | null>(null);
  readonly isLoading = signal<boolean>(true);

  // Visionneuse photo plein écran
  readonly lightboxVariante = signal<VarianteServiceDto | null>(null);
  readonly lightboxIndex = signal<number>(0);

  readonly lightboxImages = computed<string[]>(() => {
    const v = this.lightboxVariante();
    if (!v) return [];
    const imgs = this.getImages(v);
    if (imgs.length > 0) return imgs;
    const fallback = this.service()?.imageUrl;
    return fallback ? [fallback] : [];
  });

  readonly lightboxCurrent = computed<string | null>(() => {
    const imgs = this.lightboxImages();
    return imgs[this.lightboxIndex()] || imgs[0] || null;
  });

  /** Formules du service déjà ajoutées au rendez-vous. */
  readonly selectedCountInService = computed<number>(() => {
    const s = this.service();
    if (!s || !s.variantes) return 0;
    return s.variantes.filter((v) => this.bookingStore.isVarianteSelected(v.id)).length;
  });

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  get salonNom(): string {
    return this.contextStore.salon()?.nom || 'Le Salon';
  }

  async ngOnInit(): Promise<void> {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const serviceIdStr = this.route.snapshot.paramMap.get('serviceId');
    const serviceId = serviceIdStr ? parseInt(serviceIdStr, 10) : null;
    const slug = this.slugSalon;

    if (slug && serviceId) {
      try {
        const [servicesList, coiffeursList] = await Promise.all([
          firstValueFrom(this.vitrineService.getServices(slug)),
          firstValueFrom(this.vitrineService.getCoiffeurs(slug)).catch(() => [] as ProfilCoiffeur[])
        ]);

        const found = servicesList.find((s) => s.id === serviceId);
        if (found && found.statut && found.variantes && found.variantes.some((v) => v.statut !== false)) {
          found.variantes = found.variantes.filter((v) => v.statut !== false);
          this.service.set(found);
        } else {
          this.service.set(null);
        }
        this.coiffeurs.set(coiffeursList || []);
        this.selectedCoiffeurId.set(this.bookingStore.selectedCoiffeurId());
      } catch {
        this.service.set(null);
      } finally {
        this.isLoading.set(false);
      }
    } else {
      this.isLoading.set(false);
    }
  }

  // ---------- Aides d'affichage ----------

  /** Photos distinctes d'une formule (photo principale en premier). */
  getImages(v: VarianteServiceDto): string[] {
    const imgs: string[] = [];
    if (v.imageUrl) imgs.push(v.imageUrl);
    for (const u of v.imagesUrls || []) {
      if (u && !imgs.includes(u)) imgs.push(u);
    }
    return imgs;
  }

  /** Photo de couverture d'une ligne de formule (repli sur la photo du service). */
  getCover(v: VarianteServiceDto): string | null {
    return this.getImages(v)[0] || this.service()?.imageUrl || null;
  }

  getPhotosCount(v: VarianteServiceDto): number {
    return this.getImages(v).length;
  }

  get minPrice(): number {
    const list = this.service()?.variantes || [];
    return list.length ? Math.min(...list.map((v) => v.prix)) : 0;
  }

  get maxPrice(): number {
    const list = this.service()?.variantes || [];
    return list.length ? Math.max(...list.map((v) => v.prix)) : 0;
  }

  get minDuree(): number {
    const list = this.service()?.variantes || [];
    return list.length ? Math.min(...list.map((v) => v.dureeMinutes)) : 0;
  }

  get maxDuree(): number {
    const list = this.service()?.variantes || [];
    return list.length ? Math.max(...list.map((v) => v.dureeMinutes)) : 0;
  }

  /** 90 → « 1h30 », 45 → « 45 min ». */
  formatDuree(minutes: number): string {
    if (!minutes || minutes < 60) return `${minutes || 0} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
  }

  initialsOf(c: ProfilCoiffeur): string {
    return `${(c.coiffeurPrenom || '').charAt(0)}${(c.coiffeurNom || '').charAt(0)}`.toUpperCase() || '?';
  }

  // ---------- Sélection ----------

  isVarianteSelected(id: number): boolean {
    return this.bookingStore.isVarianteSelected(id);
  }

  async onToggleVariante(event: MouseEvent, v: VarianteServiceDto): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    const s = this.service();
    const serviceNom = s ? s.nom : 'Prestation';

    const wasSelected = this.isVarianteSelected(v.id);

    if (!wasSelected) {
      // Animation volante vers la navbar ou dock
      const btn = event.currentTarget as HTMLElement;
      this.flyToTargetService.fly(btn, '.dock-btn-booking, .btn-salon-cta-book', {
        color: '#4A3B32',
        icon: 'calendar_month'
      });
    }

    const images = this.getImages(v);
    const isAdded = this.bookingStore.toggleVariante({
      id: v.id,
      serviceId: s?.id,
      serviceNom,
      varianteNom: v.nom,
      dureeMinutes: v.dureeMinutes,
      prix: v.prix,
      imageUrl: images[0] || s?.imageUrl,
      description: v.description || s?.description,
      imagesUrls: images
    });

    if (isAdded) {
      this.notificationService.success(`${v.nom} ajouté à votre sélection !`);
    } else {
      this.notificationService.info(`${v.nom} retiré de votre sélection.`);
    }
  }

  removeSelected(id: number): void {
    this.bookingStore.removeVariante(id);
  }

  setCoiffeurPreference(coiffeurId: number | null, nom: string | null = null): void {
    this.selectedCoiffeurId.set(coiffeurId);
    this.bookingStore.setCoiffeur(coiffeurId, nom);
  }

  openBookingDrawer(): void {
    this.bookingStore.openDrawer();
  }

  goToCheckout(): void {
    this.bookingStore.persistToGuest(this.slugSalon);
    this.router.navigate(['/' + this.slugSalon + '/rdv']);
  }

  // ---------- Visionneuse ----------

  openLightbox(v: VarianteServiceDto, index = 0, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.getImages(v).length === 0 && !this.service()?.imageUrl) return;
    this.lightboxIndex.set(index);
    this.lightboxVariante.set(v);
  }

  closeLightbox(): void {
    this.lightboxVariante.set(null);
  }

  prevPhoto(event?: Event): void {
    event?.stopPropagation();
    const total = this.lightboxImages().length;
    if (total > 1) this.lightboxIndex.update((i) => (i - 1 + total) % total);
  }

  nextPhoto(event?: Event): void {
    event?.stopPropagation();
    const total = this.lightboxImages().length;
    if (total > 1) this.lightboxIndex.update((i) => (i + 1) % total);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeLightbox();
  }

  @HostListener('document:keydown.arrowleft')
  onArrowLeft(): void {
    if (this.lightboxVariante()) this.prevPhoto();
  }

  @HostListener('document:keydown.arrowright')
  onArrowRight(): void {
    if (this.lightboxVariante()) this.nextPhoto();
  }
}
