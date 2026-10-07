import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { FermetureExceptionnelle, FermetureExceptionnelleCreateDto } from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-fermetures',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-fermetures.component.html',
  styleUrl: './proprietaire-fermetures.component.css'
})
export class ProprietaireFermeturesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly notificationService = inject(NotificationService);

  readonly fermetures = signal<FermetureExceptionnelle[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Modal State
  showModal = false;
  isEditMode = false;
  isStartedClosure = false;
  selectedId: number | null = null;
  isSubmitting = false;

  formData: FermetureExceptionnelleCreateDto = {
    dateDebut: '',
    dateFin: '',
    motif: ''
  };

  get todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  get minDateDebut(): string {
    return this.todayStr;
  }

  get minDateFin(): string {
    if (this.formData.dateDebut && this.formData.dateDebut >= this.todayStr) {
      return this.formData.dateDebut;
    }
    return this.todayStr;
  }

  ngOnInit(): void {
    this.chargerFermetures();
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

  chargerFermetures(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.listerFermetures(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.fermetures.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors de la récupération des fermetures.');
      }
    });
  }

  getStatut(f: FermetureExceptionnelle): 'EN_COURS' | 'A_VENIR' | 'PASSEE' {
    const today = this.todayStr;
    if (f.dateDebut > today) return 'A_VENIR';
    if (f.dateFin < today) return 'PASSEE';
    return 'EN_COURS';
  }

  canDelete(f: FermetureExceptionnelle): boolean {
    return f.dateDebut > this.todayStr;
  }

  canEndEarly(f: FermetureExceptionnelle): boolean {
    return this.getStatut(f) === 'EN_COURS';
  }

  canEdit(f: FermetureExceptionnelle): boolean {
    return f.dateFin >= this.todayStr;
  }

  onDateDebutChange(): void {
    if (this.formData.dateDebut && this.formData.dateFin && this.formData.dateFin < this.formData.dateDebut) {
      this.formData.dateFin = this.formData.dateDebut;
    }
  }

  openCreateModal(): void {
    const today = this.todayStr;
    this.isEditMode = false;
    this.isStartedClosure = false;
    this.selectedId = null;
    this.formData = {
      dateDebut: today,
      dateFin: today,
      motif: ''
    };
    this.showModal = true;
  }

  openEditModal(f: FermetureExceptionnelle): void {
    const today = this.todayStr;
    if (f.dateFin < today) {
      this.notificationService.error('Impossible de modifier une fermeture exceptionnelle passée.', 'Fermeture passée');
      return;
    }
    this.isEditMode = true;
    this.selectedId = f.id;
    this.isStartedClosure = f.dateDebut <= today;
    this.formData = {
      dateDebut: f.dateDebut,
      dateFin: f.dateFin,
      motif: f.motif || ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isSubmitting = false;
  }

  soumettreFormulaire(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.formData.dateDebut || !this.formData.dateFin) {
      this.notificationService.error('Veuillez renseigner la date de début et la date de fin.', 'Formulaire incomplet');
      return;
    }

    const today = this.todayStr;

    // Règle métier stricte : le propriétaire ne doit pas créer une fermeture dans le passé
    if (!this.isEditMode || !this.isStartedClosure) {
      if (this.formData.dateDebut < today) {
        this.notificationService.error('La date de début ne peut pas être dans le passé.', 'Date invalide');
        return;
      }
    }

    if (this.formData.dateFin < today) {
      this.notificationService.error('La date de fin ne peut pas être dans le passé.', 'Date invalide');
      return;
    }

    if (this.formData.dateDebut > this.formData.dateFin) {
      this.notificationService.error('La date de début ne peut pas être postérieure à la date de fin.', 'Dates invalides');
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode && this.selectedId) {
      this.proprietaireService.modifierFermeture(slug, this.selectedId, this.formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.notificationService.success('La fermeture exceptionnelle a été modifiée avec succès.', 'Fermeture modifiée');
          this.chargerFermetures();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notificationService.error(err?.error?.message || 'Erreur lors de la modification de la fermeture.', 'Erreur');
        }
      });
    } else {
      this.proprietaireService.ajouterFermeture(slug, this.formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.notificationService.success('La fermeture exceptionnelle a été enregistrée avec succès.', 'Fermeture créée');
          this.chargerFermetures();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notificationService.error(err?.error?.message || 'Erreur lors de l’ajout de la fermeture.', 'Erreur');
        }
      });
    }
  }

  mettreFinFermeture(f: FermetureExceptionnelle): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!confirm(`Voulez-vous clôturer cette fermeture exceptionnelle immédiatement ? La date de fin sera fixée à aujourd'hui.`)) {
      return;
    }

    this.proprietaireService.mettreFinFermeture(slug, f.id).subscribe({
      next: () => {
        this.notificationService.success('La fermeture a été clôturée aujourd’hui avec succès.', 'Fermeture clôturée');
        this.chargerFermetures();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Impossible de mettre fin à la fermeture.', 'Erreur');
      }
    });
  }

  supprimerFermeture(f: FermetureExceptionnelle): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.canDelete(f)) {
      this.notificationService.error('Seules les fermetures futures peuvent être supprimées.', 'Action non autorisée');
      return;
    }

    if (!confirm(`Supprimer définitivement la fermeture du ${f.dateDebut} au ${f.dateFin} ?`)) {
      return;
    }

    this.proprietaireService.supprimerFermeture(slug, f.id).subscribe({
      next: () => {
        this.notificationService.success('La fermeture a été supprimée avec succès.', 'Fermeture supprimée');
        this.chargerFermetures();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Erreur lors de la suppression de la fermeture.', 'Erreur');
      }
    });
  }
}
