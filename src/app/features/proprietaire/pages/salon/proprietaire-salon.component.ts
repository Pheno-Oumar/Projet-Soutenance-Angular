import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
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
  private readonly authService = inject(AuthService);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly notificationService = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly salon = signal<Salon | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isUploadingLogo = signal<boolean>(false);
  readonly isUploadingCover = signal<boolean>(false);
  readonly isLocating = signal<boolean>(false);
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

  coverFile: File | null = null;
  coverPreviewUrl: string | null = null;

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
          const currentCtx = this.authService.currentSalonContext();
          if (currentCtx) {
            this.authService.setSalonContext(
              currentCtx.slugSalon,
              currentCtx.roles,
              res.data.nom,
              currentCtx.actif,
              res.data.logoUrl || currentCtx.logoUrl
            );
          }
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
        this.cdr.detectChanges();
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
          const currentCtx = this.authService.currentSalonContext();
          if (currentCtx) {
            this.authService.setSalonContext(
              currentCtx.slugSalon,
              currentCtx.roles,
              currentCtx.nomSalon,
              currentCtx.actif,
              res.data.logoUrl || currentCtx.logoUrl
            );
          }
          this.notificationService.success('Le logo a été converti en WebP et mis en ligne avec succès sur Cloudinary.', 'Logo mis à jour');
        }
      },
      error: (err) => {
        this.isUploadingLogo.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors de l’envoi du logo.', 'Erreur');
      }
    });
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.coverFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.coverPreviewUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.coverFile);
    }
  }

  televerserCover(): void {
    if (!this.coverFile) return;
    const slug = this.slugSalon;
    if (!slug) return;

    this.isUploadingCover.set(true);
    this.proprietaireService.uploadCover(slug, this.coverFile).subscribe({
      next: (res) => {
        this.isUploadingCover.set(false);
        this.coverFile = null;
        this.coverPreviewUrl = null;
        if (res?.data) {
          this.salon.set(res.data);
          this.notificationService.success('La photo de couverture a été mise en ligne avec succès sur Cloudinary.', 'Couverture actualisée');
        }
      },
      error: (err) => {
        this.isUploadingCover.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors de l’envoi de la photo de couverture.', 'Erreur');
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

  meLocaliser(): void {
    if (!navigator.geolocation) {
      this.notificationService.error(
        'La géolocalisation n’est pas prise en charge par votre navigateur.',
        'Géolocalisation indisponible'
      );
      return;
    }

    this.isLocating.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating.set(false);
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));

        this.formData.latitude = lat;
        this.formData.longitude = lng;

        this.updateMapPosition(lat, lng);
        this.notificationService.success(
          `Position GPS détectée avec succès (${lat}, ${lng}). N'oubliez pas d'enregistrer les modifications.`,
          'Position actualisée'
        );
      },
      (error) => {
        this.isLocating.set(false);
        let msg = 'Impossible d’accéder à votre position actuelle.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Accès à la position refusé. Veuillez autoriser la localisation dans les paramètres de votre navigateur.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Les coordonnées GPS de votre appareil sont actuellement indisponibles.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'La recherche de votre position a expiré.';
        }
        this.notificationService.error(msg, 'Erreur de localisation');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }
}
