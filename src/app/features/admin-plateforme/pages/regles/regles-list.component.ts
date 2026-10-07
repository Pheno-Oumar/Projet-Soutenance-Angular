import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminSystemService } from '../../services/admin-system.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReglePlateforme, ReglePlateformeCreateDto, ReglePlateformeUpdateDto } from '../../../../shared/models';

@Component({
  selector: 'app-regles-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule],
  templateUrl: './regles-list.component.html',
  styleUrl: './regles-list.component.css'
})
export class ReglesListComponent implements OnInit {
  private readonly adminService = inject(AdminSystemService);
  private readonly notificationService = inject(NotificationService);

  readonly regles = signal<ReglePlateforme[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly filterMode = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal
  readonly isModalOpen = signal<boolean>(false);
  readonly editingRegle = signal<ReglePlateforme | null>(null);
  readonly isSaving = signal<boolean>(false);

  modalForm = {
    titre: '',
    description: ''
  };

  ngOnInit(): void {
    this.chargerRegles();
  }

  chargerRegles(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.listerRegles().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.regles.set(res.data || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Impossible de récupérer les règles.');
      }
    });
  }

  readonly filteredRegles = computed(() => {
    const list = this.regles();
    const query = this.searchQuery().toLowerCase().trim();
    const mode = this.filterMode();

    return list.filter((r) => {
      if (mode === 'ACTIVE' && !r.actif) return false;
      if (mode === 'INACTIVE' && r.actif) return false;

      if (query) {
        return (
          r.titre.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  });

  countActives = computed(() => this.regles().filter((r) => r.actif).length);
  countInactives = computed(() => this.regles().filter((r) => !r.actif).length);

  ouvrirModalCreation(): void {
    this.editingRegle.set(null);
    this.modalForm = { titre: '', description: '' };
    this.isModalOpen.set(true);
  }

  ouvrirModalEdition(regle: ReglePlateforme): void {
    this.editingRegle.set(regle);
    this.modalForm = { titre: regle.titre, description: regle.description };
    this.isModalOpen.set(true);
  }

  fermerModal(): void {
    this.isModalOpen.set(false);
    this.editingRegle.set(null);
  }

  sauvegarderRegle(): void {
    const edit = this.editingRegle();
    this.isSaving.set(true);

    if (edit) {
      const dto: ReglePlateformeUpdateDto = {
        titre: this.modalForm.titre.trim(),
        description: this.modalForm.description.trim()
      };
      this.adminService.modifierRegle(edit.id, dto).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.fermerModal();
          this.regles.update((list) =>
            list.map((r) => (r.id === edit.id ? { ...r, ...res.data } : r))
          );
          this.notificationService.success(
            'La règle a été mise à jour avec succès.',
            'Règle Modifiée'
          );
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.error(
            err?.error?.message || 'Erreur lors de la modification de la règle.',
            'Action Échouée'
          );
        }
      });
    } else {
      const dto: ReglePlateformeCreateDto = {
        titre: this.modalForm.titre.trim(),
        description: this.modalForm.description.trim()
      };
      this.adminService.creerRegle(dto).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.fermerModal();
          this.regles.update((list) => [res.data, ...list]);
          this.notificationService.success(
            'La nouvelle règle a été créée avec succès.',
            'Règle Créée'
          );
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notificationService.error(
            err?.error?.message || 'Erreur lors de la création de la règle.',
            'Action Échouée'
          );
        }
      });
    }
  }

  activerRegle(regle: ReglePlateforme): void {
    this.adminService.activerRegle(regle.id).subscribe({
      next: (res) => {
        this.regles.update((list) =>
          list.map((r) => (r.id === regle.id ? { ...r, actif: true } : r))
        );
        this.notificationService.success(
          `La règle "${regle.titre}" est désormais active.`,
          'Règle Activée'
        );
      },
      error: (err) => {
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de l’activation de la règle.',
          'Action Échouée'
        );
      }
    });
  }

  desactiverRegle(regle: ReglePlateforme): void {
    this.adminService.desactiverRegle(regle.id).subscribe({
      next: (res) => {
        this.regles.update((list) =>
          list.map((r) => (r.id === regle.id ? { ...r, actif: false } : r))
        );
        this.notificationService.success(
          `La règle "${regle.titre}" a été désactivée.`,
          'Règle Désactivée'
        );
      },
      error: (err) => {
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la désactivation de la règle.',
          'Action Échouée'
        );
      }
    });
  }
}
