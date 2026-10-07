import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ComptableService } from '../../services/comptable.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Depense, DepenseCreateDto, CategorieDepense } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-comptable-depenses',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './comptable-depenses.component.html',
  styleUrl: './comptable-depenses.component.css'
})
export class ComptableDepensesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly comptableService = inject(ComptableService);
  private readonly notificationService = inject(NotificationService);

  readonly depenses = signal<Depense[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filters
  selectedCategorie: CategorieDepense | '' = '';
  selectedStatut: string = ''; // '', 'true', 'false'

  // Modal Création
  showCreateModal = false;
  isSubmitting = false;
  newDepense: DepenseCreateDto = {
    montant: 0,
    categorie: 'AUTRE',
    description: ''
  };
  modalError: string | null = null;

  // Modal Détail
  showDetailModal = false;
  selectedDepense: Depense | null = null;

  readonly categoriesList: CategorieDepense[] = [
    'LOYER',
    'ELECTRICITE',
    'EAU',
    'INTERNET',
    'SALAIRE',
    'FOURNITURES',
    'ACHAT_STOCK',
    'ENTRETIEN',
    'REMBOURSEMENT',
    'TRANSPORT',
    'AUTRE'
  ];

  ngOnInit(): void {
    this.chargerDepenses();
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

  chargerDepenses(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const catParam = this.selectedCategorie ? this.selectedCategorie : undefined;
    const statutParam = this.selectedStatut === 'true' ? true : (this.selectedStatut === 'false' ? false : undefined);

    this.comptableService.listerDepenses(slug, catParam, statutParam).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.depenses.set(res.data);
        } else {
          this.errorMessage.set(res.message || 'Impossible de charger les dépenses');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des dépenses');
      }
    });
  }

  ouvrirModalCreation(): void {
    this.newDepense = {
      montant: 0,
      categorie: 'ACHAT_STOCK',
      description: ''
    };
    this.modalError = null;
    this.showCreateModal = true;
  }

  fermerModalCreation(): void {
    this.showCreateModal = false;
  }

  creerDepense(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.newDepense.montant || this.newDepense.montant <= 0) {
      this.modalError = 'Le montant de la dépense doit être supérieur à zéro.';
      return;
    }

    this.isSubmitting = true;
    this.modalError = null;

    this.comptableService.creerDepense(slug, this.newDepense).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.showCreateModal = false;
          this.successMessage.set('Dépense enregistrée et débitée de la caisse avec succès !');
          this.notificationService.success('Dépense enregistrée et débitée de la caisse avec succès !');
          setTimeout(() => this.successMessage.set(null), 4000);
          this.chargerDepenses();
        } else {
          const errMsg = res.message || 'Erreur lors de l’enregistrement';
          this.modalError = errMsg;
          this.notificationService.error(errMsg);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        const errMsg = err.error?.message || 'Erreur lors de l’enregistrement de la dépense';
        this.modalError = errMsg;
        this.notificationService.error(errMsg);
      }
    });
  }

  ouvrirDetail(depense: Depense): void {
    this.selectedDepense = depense;
    this.showDetailModal = true;
  }

  fermerDetailModal(): void {
    this.showDetailModal = false;
    this.selectedDepense = null;
  }

  annulerDepense(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette dépense ? Cette action est irréversible.')) {
      return;
    }

    const slug = this.slugSalon;
    if (!slug) return;

    this.comptableService.annulerDepense(slug, id).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage.set('La dépense a été annulée avec succès.');
          this.notificationService.success('La dépense a été annulée avec succès.');
          setTimeout(() => this.successMessage.set(null), 3000);
          this.showDetailModal = false;
          this.chargerDepenses();
        }
      },
      error: (err) => {
        this.notificationService.error(err.error?.message || 'Impossible d’annuler cette dépense');
      }
    });
  }

  get totalDepensesFiltrees(): number {
    return this.depenses()
      .filter((d) => d.statut)
      .reduce((acc, d) => acc + (d.montant || 0), 0);
  }
}
