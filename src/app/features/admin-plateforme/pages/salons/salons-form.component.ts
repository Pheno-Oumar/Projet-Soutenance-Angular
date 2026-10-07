import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminSystemService } from '../../services/admin-system.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalonCreateDto } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';

@Component({
  selector: 'app-salons-form',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule],
  templateUrl: './salons-form.component.html',
  styleUrl: './salons-form.component.css'
})
export class SalonsFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminSystemService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  readonly salonForm: FormGroup = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    emailProprietaire: ['', [Validators.required, Validators.email]],
    telephone: [''],
    email: [''],
    adresse: [''],
    description: [''],
    logoUrl: [''],
    latitude: [null],
    longitude: [null]
  });

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly pickerMap = viewChild<ElementRef<HTMLDivElement>>('pickerMap');
  private leafletMap?: L.Map;
  private marker?: L.Marker;

  constructor() {
    afterNextRender(() => {
      this.initPickerMap();
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = undefined;
    }
  }

  isFieldInvalid(name: string): boolean {
    const field = this.salonForm.get(name);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  hasCoordinates(): boolean {
    const lat = this.salonForm.get('latitude')?.value;
    const lng = this.salonForm.get('longitude')?.value;
    return lat !== null && lat !== undefined && lat !== '' &&
           lng !== null && lng !== undefined && lng !== '';
  }

  reinitialiserCoordonnees(): void {
    this.salonForm.patchValue({ latitude: null, longitude: null });
    if (this.marker && this.leafletMap) {
      this.leafletMap.removeLayer(this.marker);
      this.marker = undefined;
    }
  }

  geolocaliserNavigateur(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.setMarkerPosition(lat, lng, true);
        },
        (err) => {
          this.notificationService.warning('Impossible de récupérer la position GPS depuis le navigateur.');
        }
      );
    } else {
      this.notificationService.warning('La géolocalisation n’est pas supportée par votre navigateur.');
    }
  }

  onManualCoordsChange(): void {
    const lat = parseFloat(this.salonForm.get('latitude')?.value);
    const lng = parseFloat(this.salonForm.get('longitude')?.value);

    if (!isNaN(lat) && !isNaN(lng)) {
      this.setMarkerPosition(lat, lng, true);
    }
  }

  private initPickerMap(): void {
    const el = this.pickerMap()?.nativeElement;
    if (!el || this.leafletMap) return;

    // Default center on Abidjan
    const initialLat = 5.359952;
    const initialLng = -4.008256;

    this.leafletMap = L.map(el, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([initialLat, initialLng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.leafletMap);

    // Click handler to pick location
    this.leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      this.setMarkerPosition(e.latlng.lat, e.latlng.lng, false);
    });
  }

  private setMarkerPosition(lat: number, lng: number, pan: boolean): void {
    if (!this.leafletMap) return;

    this.salonForm.patchValue({
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6))
    });

    const customIcon = L.divIcon({
      className: 'picker-pin',
      html: `
        <div style="
          background-color: #D4AF37;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          border: 2px solid #FFFFFF;
        ">
          <span class="material-symbols-outlined" style="transform: rotate(45deg); font-size: 16px; color: #FFFFFF;">location_on</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.leafletMap);
    }

    if (pan) {
      this.leafletMap.setView([lat, lng], 14);
    }
  }

  onSubmit(): void {
    if (this.salonForm.invalid) {
      this.salonForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.salonForm.value;
    const request: SalonCreateDto = {
      nom: val.nom.trim(),
      emailProprietaire: val.emailProprietaire.trim(),
      telephone: val.telephone ? val.telephone.trim() : undefined,
      email: val.email ? val.email.trim() : undefined,
      adresse: val.adresse ? val.adresse.trim() : undefined,
      description: val.description ? val.description.trim() : undefined,
      logoUrl: val.logoUrl ? val.logoUrl.trim() : undefined,
      latitude: val.latitude !== null && val.latitude !== '' ? parseFloat(val.latitude) : undefined,
      longitude: val.longitude !== null && val.longitude !== '' ? parseFloat(val.longitude) : undefined
    };

    this.adminService.creerSalon(request).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.notificationService.success(
          `Le salon "${res.data.nom}" a été créé avec succès.`,
          'Salon Créé'
        );
        this.router.navigate(['/admin-plateforme/salons']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message || 'Erreur lors de la création du salon.';
        this.errorMessage.set(msg);
        this.notificationService.error(msg, 'Création Échouée');
      }
    });
  }
}
