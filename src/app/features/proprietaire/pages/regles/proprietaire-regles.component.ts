import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RegleSalon, RegleSalonCreateDto } from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-regles',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-regles.component.html',
  styleUrl: './proprietaire-regles.component.css'
})
export class ProprietaireReglesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly notificationService = inject(NotificationService);

  readonly regles = signal<RegleSalon[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Modal State
  showModal = false;
  isEditMode = false;
  selectedId: number | null = null;
  isSubmitting = false;

  formData: RegleSalonCreateDto = {
    titre: '',
    description: ''
  };

  ngOnInit(): void {
    this.chargerRegles();
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

  chargerRegles(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.listerRegles(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.regles.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des règles du salon.');
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedId = null;
    this.formData = {
      titre: '',
      description: ''
    };
    this.showModal = true;
  }

  openEditModal(r: RegleSalon): void {
    this.isEditMode = true;
    this.selectedId = r.id;
    this.formData = {
      titre: r.titre,
      description: r.description
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isSubmitting = false;
  }

  soumettre(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.formData.titre.trim() || !this.formData.description.trim()) {
      this.notificationService.error('Veuillez renseigner le titre et la description de la règle.', 'Champs requis');
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode && this.selectedId) {
      this.proprietaireService.modifierRegle(slug, this.selectedId, this.formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.notificationService.success('La règle du salon a été modifiée avec succès.', 'Règle modifiée');
          this.chargerRegles();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notificationService.error(err?.error?.message || 'Erreur lors de la modification de la règle.', 'Erreur');
        }
      });
    } else {
      this.proprietaireService.creerRegle(slug, this.formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.notificationService.success('La nouvelle règle a été ajoutée et notifiée.', 'Règle créée');
          this.chargerRegles();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notificationService.error(err?.error?.message || 'Erreur lors de la création de la règle.', 'Erreur');
        }
      });
    }
  }

  supprimerRegle(r: RegleSalon): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!confirm(`Supprimer définitivement la règle "${r.titre}" ?`)) {
      return;
    }

    this.proprietaireService.supprimerRegle(slug, r.id).subscribe({
      next: () => {
        this.notificationService.success('La règle a été supprimée avec succès.', 'Règle supprimée');
        this.chargerRegles();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Erreur lors de la suppression de la règle.', 'Erreur');
      }
    });
  }
}
