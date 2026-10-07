import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Salon, SalonUpdateDto } from '../../../../shared/models';
import * as L from 'leaflet';

@Component({
  selector: 'app-proprietaire-salon',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-salon.component.html',
  styleUrl: './proprietaire-salon.component.css'
})
export class ProprietaireSalonComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly notificationService = inject(NotificationService);

  readonly salon = signal<Salon | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isUploadingLogo = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Form model
  formData: SalonUpdateDto = {
    nom: '',
    description: '',
    adresse: '',
    telephone: '',
    email: '',
    latitude: 14.6937,
    longitude: -17.4441
  };

  logoFile: File | null = null;
  logoPreviewUrl: string | null = null;

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  private map?: L.Map;
  private marker?: L.Marker;

  constructor() {
    afterNextRender(() => {
      this.initMap();
    });
  }

  ngOnInit(): void {
    this.chargerSalon();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  get slugSalon(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const slug = r.snapshot.paramMap.get('slugSalon');
      if (slug) return slug;
      r = r.parent;
    }
    return '';
  }

  chargerSalon(): void {
    const slug = this.slugSalon;
    if (!slug) {
      this.errorMessage.set('Identifiant du salon introuvable.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.getSalon(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          const s = res.data;
          this.salon.set(s);
          this.formData = {
            nom: s.nom || '',
            description: s.description || '',
            adresse: s.adresse || '',
            telephone: s.telephone || '',
            email: s.email || '',
            latitude: s.latitude ?? 14.6937,
            longitude: s.longitude ?? -17.4441
          };
          this.updateMapPosition(this.formData.latitude ?? 14.6937, this.formData.longitude ?? -17.4441);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des informations du salon.');
      }
    });
  }

  sauvegarder(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isSaving.set(true);
    this.proprietaireService.updateSalon(slug, this.formData).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res?.data) {
          this.salon.set(res.data);
          this.notificationService.success('Les coordonnées du salon ont été mises à jour avec succès.', 'Salon actualisé');
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notificationService.error(err?.error?.message || 'Impossible de mettre à jour le salon.', 'Erreur');
      }
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.logoFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.logoFile);
    }
  }

  televerserLogo(): void {
    if (!this.logoFile) return;
    const slug = this.slugSalon;
    if (!slug) return;

    this.isUploadingLogo.set(true);
    this.proprietaireService.uploadLogo(slug, this.logoFile).subscribe({
      next: (res) => {
        this.isUploadingLogo.set(false);
        this.logoFile = null;
        this.logoPreviewUrl = null;
        if (res?.data) {
          this.salon.set(res.data);
          this.notificationService.success('Le logo a été converti en WebP et mis en ligne avec succès sur Cloudinary.', 'Logo mis à jour');
        }
      },
      error: (err) => {
        this.isUploadingLogo.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors de l’envoi du logo.', 'Erreur');
      }
    });
  }

  private initMap(): void {
    const container = this.mapContainer()?.nativeElement;
    if (!container || this.map) return;

    const lat = this.formData.latitude ?? 14.6937;
    const lng = this.formData.longitude ?? -17.4441;

    this.map = L.map(container).setView([lat, lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    this.marker = L.marker([lat, lng], { draggable: true, icon }).addTo(this.map);

    this.marker.on('dragend', () => {
      if (this.marker) {
        const pos = this.marker.getLatLng();
        this.formData.latitude = parseFloat(pos.lat.toFixed(6));
        this.formData.longitude = parseFloat(pos.lng.toFixed(6));
      }
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.marker) {
        this.marker.setLatLng(e.latlng);
        this.formData.latitude = parseFloat(e.latlng.lat.toFixed(6));
        this.formData.longitude = parseFloat(e.latlng.lng.toFixed(6));
      }
    });
  }

  private updateMapPosition(lat: number, lng: number): void {
    if (this.map && this.marker) {
      const coords: L.LatLngExpression = [lat, lng];
      this.marker.setLatLng(coords);
      this.map.setView(coords, 14);
    }
  }

  onCoordChange(): void {
    if (this.formData.latitude != null && this.formData.longitude != null) {
      this.updateMapPosition(this.formData.latitude, this.formData.longitude);
    }
  }
}
