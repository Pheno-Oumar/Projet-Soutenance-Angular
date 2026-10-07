import { Component, OnInit, inject, signal } from '@angular/core';
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
import { Tilt3dDirective } from '../../interactions/tilt-3d.directive';
import { RevealOnScrollDirective } from '../../interactions/reveal-on-scroll.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-salon-service-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    SafeMediaUrlPipe,
    Tilt3dDirective,
    RevealOnScrollDirective
  ],
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
      } catch {
        this.service.set(null);
      } finally {
        this.isLoading.set(false);
      }
    } else {
      this.isLoading.set(false);
    }
  }

  isVarianteSelected(id: number): boolean {
    return this.bookingStore.isVarianteSelected(id);
  }

  async onToggleVariante(event: MouseEvent, v: VarianteServiceDto): Promise<void> {
    event.stopPropagation();
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

    const isAdded = this.bookingStore.toggleVariante({
      id: v.id,
      serviceId: s?.id,
      serviceNom,
      varianteNom: v.nom,
      dureeMinutes: v.dureeMinutes,
      prix: v.prix,
      imageUrl: v.imageUrl || s?.imageUrl
    });

    if (isAdded) {
      this.notificationService.success(`${v.nom} ajouté à votre sélection !`);
    } else {
      this.notificationService.info(`${v.nom} retiré de votre sélection.`);
    }
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
}
