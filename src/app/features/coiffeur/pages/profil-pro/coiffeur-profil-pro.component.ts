import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CoiffeurService } from '../../services/coiffeur.service';
import { ProfilCoiffeur, ProfilCoiffeurDto } from '../../../../shared/models';

import { NotificationService } from '../../../../core/services/notification.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-coiffeur-profil-pro',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './coiffeur-profil-pro.component.html',
  styleUrl: './coiffeur-profil-pro.component.css'
})
export class CoiffeurProfilProComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly coiffeurService = inject(CoiffeurService);
  private readonly notificationService = inject(NotificationService);

  readonly profil = signal<ProfilCoiffeur | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isUploading = signal<boolean>(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  formDto: ProfilCoiffeurDto = {
    nomAffichage: '',
    biographie: '',
    anneeExperience: 0,
    description: ''
  };

  ngOnInit(): void {
    this.chargerProfil();
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

  chargerProfil(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.coiffeurService.getProfil(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.profil.set(res.data);
          this.formDto = {
            nomAffichage: res.data.nomAffichage || '',
            biographie: res.data.biographie || '',
            anneeExperience: res.data.anneeExperience || 0,
            description: res.data.description || ''
          };
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de la récupération du profil');
      }
    });
  }

  sauvegarder(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.coiffeurService.updateProfil(slug, this.formDto).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res.success && res.data) {
          this.profil.set(res.data);
          this.successMessage.set('Votre profil professionnel a été mis à jour avec succès !');
          this.notificationService.success('Votre profil professionnel a été mis à jour avec succès !');
          setTimeout(() => this.successMessage.set(null), 4000);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.message || 'Erreur lors de la mise à jour du profil';
        this.errorMessage.set(msg);
        this.notificationService.error(msg);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const slug = this.slugSalon;
    if (!slug) return;

    this.isUploading.set(true);
    this.errorMessage.set(null);

    this.coiffeurService.uploadPhotoProfil(slug, file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        if (res.success && res.data) {
          this.profil.set(res.data);
          this.successMessage.set('Photo de profil mise à jour avec succès !');
          this.notificationService.success('Photo de profil mise à jour avec succès !');
          setTimeout(() => this.successMessage.set(null), 4000);
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        const msg = err.error?.message || 'Erreur lors de l’upload de la photo';
        this.errorMessage.set(msg);
        this.notificationService.error(msg);
      }
    });
  }
}
