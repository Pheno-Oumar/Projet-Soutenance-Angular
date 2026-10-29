import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminSystemService } from '../../services/admin-system.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { Salon, HoraireOuverture } from '../../../../shared/models';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';

@Component({
  selector: 'app-salons-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SafeMediaUrlPipe, MatIconModule],
  templateUrl: './salons-detail.component.html',
  styleUrl: './salons-detail.component.css'
})
export class SalonsDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminSystemService);
  private readonly vitrineService = inject(VitrineService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly salon = signal<Salon | null>(null);
  readonly horaires = signal<HoraireOuverture[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingHoraires = signal<boolean>(false);
  readonly isTogglingStatus = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly salonMap = viewChild<ElementRef<HTMLDivElement>>('salonMap');
  private leafletMap?: L.Map;

  constructor() {
    afterNextRender(() => {
      this.initSalonMap();
    });
  }

  ngOnInit(): void {
    this.chargerSalon();
  }

  ngOnDestroy(): void {
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = undefined;
    }
  }

  hasGps(): boolean {
    const s = this.salon();
    return !!(s && s.latitude !== undefined && s.latitude !== null &&
             s.longitude !== undefined && s.longitude !== null);
  }

  chargerSalon(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.errorMessage.set('Identifiant du salon introuvable.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getSalon(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.salon.set(res.data);
        setTimeout(() => this.initSalonMap(), 100);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors de la récupération des détails du salon.');
      }
    });

    this.isLoadingHoraires.set(true);
    this.vitrineService.getHoraires(slug).subscribe({
      next: (h) => {
        this.horaires.set(h || []);
        this.isLoadingHoraires.set(false);
      },
      error: () => {
        this.horaires.set([]);
        this.isLoadingHoraires.set(false);
      }
    });
  }

  getJourLabel(jour?: string): string {
    const map: Record<string, string> = {
      LUNDI: 'Lundi',
      MARDI: 'Mardi',
      MERCREDI: 'Mercredi',
      JEUDI: 'Jeudi',
      VENDREDI: 'Vendredi',
      SAMEDI: 'Samedi',
      DIMANCHE: 'Dimanche'
    };
    return (jour ? map[jour.toUpperCase()] : '') || jour || '';
  }

  async desactiverSalon(): Promise<void> {
    const s = this.salon();
    if (!s) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Désactiver le salon',
      message: `Désactiver le salon "${s.nom}" ? Les utilisateurs ne pourront plus effectuer de réservations.`,
      type: 'danger',
      confirmText: 'Désactiver le salon',
      icon: 'domain_disabled'
    });
    if (!confirmed) return;

    this.isTogglingStatus.set(true);
    this.adminService.desactiverSalon(s.slug).subscribe({
      next: (res) => {
        this.isTogglingStatus.set(false);
        this.salon.set(res.data);
        this.notificationService.success(
          `Le salon "${s.nom}" a été désactivé avec succès.`,
          'Salon Désactivé'
        );
      },
      error: (err) => {
        this.isTogglingStatus.set(false);
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la désactivation du salon.',
          'Action Échouée'
        );
      }
    });
  }

  reactiverSalon(): void {
    const s = this.salon();
    if (!s) return;

    this.isTogglingStatus.set(true);
    this.adminService.reactiverSalon(s.slug).subscribe({
      next: (res) => {
        this.isTogglingStatus.set(false);
        this.salon.set(res.data);
        this.notificationService.success(
          `Le salon "${s.nom}" a été réactivé avec succès.`,
          'Salon Réactivé'
        );
      },
      error: (err) => {
        this.isTogglingStatus.set(false);
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la réactivation du salon.',
          'Action Échouée'
        );
      }
    });
  }

  formatDevise(val: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }

  private initSalonMap(): void {
    const el = this.salonMap()?.nativeElement;
    const s = this.salon();
    if (!el || !s || !s.latitude || !s.longitude) return;

    if (this.leafletMap) {
      this.leafletMap.remove();
    }

    const lat = s.latitude;
    const lng = s.longitude;

    this.leafletMap = L.map(el, {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([lat, lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.leafletMap);

    const customIcon = L.divIcon({
      className: 'detail-pin',
      html: `
        <div style="
          background-color: #D4AF37;
          width: 34px;
          height: 34px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          border: 2px solid #FFFFFF;
        ">
          <span class="material-symbols-outlined" style="transform: rotate(45deg); font-size: 16px; color: #1A1A1A;">content_cut</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34]
    });

    L.marker([lat, lng], { icon: customIcon })
      .addTo(this.leafletMap)
      .bindPopup(`<strong>${s.nom}</strong><br/>${s.adresse || ''}`)
      .openPopup();
  }
}
