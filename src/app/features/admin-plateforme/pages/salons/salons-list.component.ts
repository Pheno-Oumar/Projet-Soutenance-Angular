import { Component, OnInit, OnDestroy, inject, signal, computed, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminSystemService } from '../../services/admin-system.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Salon } from '../../../../shared/models';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';

type ViewMode = 'grid' | 'table' | 'map';

@Component({
  selector: 'app-salons-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SafeMediaUrlPipe, MatIconModule],
  templateUrl: './salons-list.component.html',
  styleUrl: './salons-list.component.css'
})
export class SalonsListComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminSystemService);
  private readonly route = inject(ActivatedRoute);

  private readonly notificationService = inject(NotificationService);

  readonly salons = signal<Salon[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionLoadingSlugs = signal<Set<string>>(new Set());

  // Vue & Filtres
  readonly viewMode = signal<ViewMode>('grid');
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  private leafletMap?: L.Map;
  private markersGroup?: L.LayerGroup;

  constructor() {
    afterNextRender(() => {
      if (this.viewMode() === 'map') {
        this.initLeafletMap();
      }
    });
  }

  ngOnInit(): void {
    // Check query params for initial view
    this.route.queryParamMap.subscribe((params) => {
      const v = params.get('view');
      if (v === 'map' || v === 'table' || v === 'grid') {
        this.viewMode.set(v);
      }
    });

    this.chargerSalons();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  chargerSalons(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.listerSalons().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.salons.set(res.data || []);
        if (this.viewMode() === 'map') {
          setTimeout(() => this.updateMapMarkers(), 100);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Impossible de récupérer la liste des salons.');
      }
    });
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const parent = img.parentElement;
      if (parent && !parent.querySelector('.avatar-placeholder')) {
        const placeholder = document.createElement('div');
        placeholder.className = 'avatar-placeholder';
        placeholder.textContent = img.alt ? img.alt.charAt(0).toUpperCase() : 'S';
        parent.appendChild(placeholder);
      }
    }
  }

  readonly filteredSalons = computed(() => {
    const list = this.salons();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    return list.filter((s) => {
      // Filtre statut
      if (status === 'ACTIVE' && !s.statut) return false;
      if (status === 'INACTIVE' && s.statut) return false;

      // Filtre recherche
      if (query) {
        const nom = (s.nom || '').toLowerCase();
        const slug = (s.slug || '').toLowerCase();
        const adresse = (s.adresse || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        return (
          nom.includes(query) ||
          slug.includes(query) ||
          adresse.includes(query) ||
          email.includes(query) ||
          desc.includes(query)
        );
      }

      return true;
    });
  });

  countActifs = computed(() => this.salons().filter((s) => s.statut).length);
  countInactifs = computed(() => this.salons().filter((s) => !s.statut).length);
  countSalonsAvecGps = computed(() => this.salons().filter((s) => s.latitude && s.longitude).length);
  countSalonsSansGps = computed(() => this.salons().filter((s) => !s.latitude || !s.longitude).length);

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'map') {
      setTimeout(() => {
        this.initLeafletMap();
      }, 100);
    }
  }

  isActionLoading(slug: string): boolean {
    return this.actionLoadingSlugs().has(slug);
  }

  desactiverSalon(salon: Salon): void {
    if (!confirm(`Confirmez-vous la désactivation du salon "${salon.nom}" ? Les utilisateurs ne pourront plus réserver.`)) {
      return;
    }

    this.setActionLoading(salon.slug, true);
    this.adminService.desactiverSalon(salon.slug).subscribe({
      next: (res) => {
        this.setActionLoading(salon.slug, false);
        this.updateSalonInList(res.data);
        this.notificationService.success(
          `Le salon "${salon.nom}" a été désactivé avec succès.`,
          'Salon Désactivé'
        );
      },
      error: (err) => {
        this.setActionLoading(salon.slug, false);
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la désactivation du salon.',
          'Action Échouée'
        );
      }
    });
  }

  reactiverSalon(salon: Salon): void {
    this.setActionLoading(salon.slug, true);
    this.adminService.reactiverSalon(salon.slug).subscribe({
      next: (res) => {
        this.setActionLoading(salon.slug, false);
        this.updateSalonInList(res.data);
        this.notificationService.success(
          `Le salon "${salon.nom}" a été réactivé avec succès.`,
          'Salon Réactivé'
        );
      },
      error: (err) => {
        this.setActionLoading(salon.slug, false);
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la réactivation du salon.',
          'Action Échouée'
        );
      }
    });
  }

  private setActionLoading(slug: string, loading: boolean): void {
    this.actionLoadingSlugs.update((set) => {
      const n = new Set(set);
      if (loading) n.add(slug);
      else n.delete(slug);
      return n;
    });
  }

  private updateSalonInList(updated: Salon): void {
    this.salons.update((list) =>
      list.map((s) => (s.slug === updated.slug ? { ...s, ...updated } : s))
    );
    if (this.viewMode() === 'map') {
      this.updateMapMarkers();
    }
  }

  formatDevise(val: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }

  // --- LEAFLET INTEGRATION ---

  private destroyMap(): void {
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = undefined;
    }
  }

  private initLeafletMap(): void {
    const el = this.mapContainer()?.nativeElement;
    if (!el) return;

    if (this.leafletMap) {
      this.leafletMap.invalidateSize();
      this.updateMapMarkers();
      return;
    }

    // Default center on Abidjan / West Africa (or center of salons)
    this.leafletMap = L.map(el, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([5.359952, -4.008256], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.leafletMap);

    this.markersGroup = L.layerGroup().addTo(this.leafletMap);
    this.updateMapMarkers();
  }

  private updateMapMarkers(): void {
    if (!this.leafletMap || !this.markersGroup) return;

    this.markersGroup.clearLayers();

    const salonsWithGeo = this.filteredSalons().filter(
      (s) => s.latitude !== undefined && s.latitude !== null && s.longitude !== undefined && s.longitude !== null
    );

    if (salonsWithGeo.length === 0) return;

    const bounds: L.LatLngExpression[] = [];

    salonsWithGeo.forEach((salon) => {
      const lat = salon.latitude!;
      const lng = salon.longitude!;
      bounds.push([lat, lng]);

      const pinColor = salon.statut ? '#D4AF37' : '#EF4444';
      const statusText = salon.statut ? 'Actif' : 'Inactif';

      // Custom HTML Marker Pin
      const customIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: `
          <div style="
            background-color: ${pinColor};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid #FFFFFF;
          ">
            <span class="material-symbols-outlined" style="
              transform: rotate(45deg);
              font-size: 16px;
              color: #1A1A1A;
            ">content_cut</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 200px; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; color: #4A3B32; font-size: 14px; font-weight: 700;">${salon.nom}</h4>
          <div style="font-size: 11px; color: #7A695F; margin-bottom: 6px;">@${salon.slug} • <strong style="color: ${pinColor};">${statusText}</strong></div>
          <div style="background: #F5F2EB; padding: 6px; border-radius: 6px; margin-bottom: 8px; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>Clients: <strong>${salon.nombreClients ?? 0}</strong></div>
            <div>Employés: <strong>${salon.nombreEmployes ?? 0}</strong></div>
            <div style="grid-column: span 2;">C.A: <strong style="color: #997819;">${this.formatDevise(salon.chiffreAffaires ?? 0)}</strong></div>
          </div>
          <a href="/admin-plateforme/salons/${salon.slug}" style="
            display: block;
            text-align: center;
            background: #4A3B32;
            color: #FFFFFF;
            text-decoration: none;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
          ">Consulter la fiche</a>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.markersGroup!.addLayer(marker);
    });

    if (bounds.length > 0) {
      this.leafletMap.fitBounds(bounds as any, { padding: [40, 40], maxZoom: 15 });
    }
  }
}
