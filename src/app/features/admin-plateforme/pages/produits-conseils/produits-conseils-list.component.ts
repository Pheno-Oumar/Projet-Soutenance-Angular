import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProduitsConseilsService } from '../../services/produits-conseils.service';
import {
  ProduitConseil,
  ProduitConseilStats,
  EtapeRoutine,
  ETAPE_ROUTINE_CONFIG,
  TYPE_CHEVEUX_OPTIONS,
  POROSITE_OPTIONS,
  ETAT_CHEVEUX_OPTIONS
} from '../../../../shared/models/produit-conseil.models';
import { ProduitsConseilsFormComponent } from './produits-conseils-form.component';
import { ProduitsConseilsDetailModalComponent } from './produits-conseils-detail-modal.component';

@Component({
  selector: 'app-produits-conseils-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    ProduitsConseilsFormComponent,
    ProduitsConseilsDetailModalComponent
  ],
  templateUrl: './produits-conseils-list.component.html',
  styleUrl: './produits-conseils-list.component.css'
})
export class ProduitsConseilsListComponent implements OnInit {
  private readonly service = inject(ProduitsConseilsService);
  private readonly router = inject(Router);

  readonly routineConfig = ETAPE_ROUTINE_CONFIG;

  // Signals
  readonly produits = signal<ProduitConseil[]>([]);
  readonly stats = signal<ProduitConseilStats | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);

  // Filters
  searchQuery = '';
  selectedEtape = signal<EtapeRoutine | 'ALL'>('ALL');
  selectedStatut = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  viewMode = signal<'GRID' | 'TABLE'>('GRID');

  // Modals & Action state
  selectedProductForDetail = signal<ProduitConseil | null>(null);
  productToEdit = signal<ProduitConseil | null>(null);
  isFormModalOpen = signal(false);
  productToDelete = signal<ProduitConseil | null>(null);
  isDeleting = signal(false);

  // Filtered list
  readonly filteredProduits = computed(() => {
    let list = this.produits();
    const query = this.searchQuery.toLowerCase().trim();
    const etape = this.selectedEtape();
    const statut = this.selectedStatut();

    if (query) {
      list = list.filter(
        (p) =>
          p.nom.toLowerCase().includes(query) ||
          (p.marque && p.marque.toLowerCase().includes(query)) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (etape !== 'ALL') {
      list = list.filter((p) => p.etapeRoutine === etape);
    }

    if (statut === 'ACTIVE') {
      list = list.filter((p) => p.actif);
    } else if (statut === 'INACTIVE') {
      list = list.filter((p) => !p.actif);
    }

    return list;
  });

  ngOnInit(): void {
    this.chargerDonnees();
  }

  chargerDonnees(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.service.lister().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.produits.set(res.data);
        } else {
          this.errorMessage.set(res.message || 'Impossible de récupérer les produits.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Erreur réseau lors de la récupération.');
        this.isLoading.set(false);
      }
    });

    this.service.getStatistiques().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.stats.set(res.data);
        }
      },
      error: () => {
        // Fallback or non-blocking
      }
    });
  }

  // Modals
  ouvrirModalCreation(): void {
    this.productToEdit.set(null);
    this.isFormModalOpen.set(true);
  }

  ouvrirModalEdition(produit: ProduitConseil): void {
    this.selectedProductForDetail.set(null);
    this.productToEdit.set(produit);
    this.isFormModalOpen.set(true);
  }

  fermerModalForm(): void {
    this.isFormModalOpen.set(false);
    this.productToEdit.set(null);
  }

  onProduitEnregistre(produit: ProduitConseil): void {
    this.fermerModalForm();
    this.afficherToast(`Le produit "${produit.nom}" a été enregistré.`);
    this.chargerDonnees();
  }

  ouvrirModalDetail(produit: ProduitConseil): void {
    this.selectedProductForDetail.set(produit);
  }

  fermerModalDetail(): void {
    this.selectedProductForDetail.set(null);
  }

  // Quick Status Toggle
  basculerStatut(produit: ProduitConseil, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.service.basculerStatut(produit.id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const updated = res.data;
          this.produits.update((list) =>
            list.map((item) => (item.id === updated.id ? updated : item))
          );
          this.afficherToast(
            `Statut de "${updated.nom}" mis à jour (${updated.actif ? 'Actif' : 'Inactif'}).`
          );
          this.rafraichirStats();
        }
      },
      error: (err) => {
        this.afficherToast(err.error?.message || 'Erreur lors du changement de statut.');
      }
    });
  }

  // Delete
  demanderSuppression(produit: ProduitConseil, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.productToDelete.set(produit);
  }

  annulerSuppression(): void {
    this.productToDelete.set(null);
  }

  confirmerSuppression(): void {
    const prod = this.productToDelete();
    if (!prod) return;

    this.isDeleting.set(true);
    this.service.supprimer(prod.id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        if (res.success) {
          this.produits.update((list) => list.filter((p) => p.id !== prod.id));
          this.productToDelete.set(null);
          this.afficherToast(`Le produit "${prod.nom}" a été supprimé.`);
          this.rafraichirStats();
        } else {
          this.afficherToast(res.message || 'Erreur lors de la suppression.');
        }
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.afficherToast(err.error?.message || 'Erreur lors de la suppression.');
      }
    });
  }

  private rafraichirStats(): void {
    this.service.getStatistiques().subscribe({
      next: (res) => {
        if (res.success && res.data) this.stats.set(res.data);
      }
    });
  }

  private afficherToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  getEtapeInfo(etape: string) {
    return this.routineConfig[etape as keyof typeof this.routineConfig] || {
      label: etape,
      description: '',
      badgeClass: 'badge-default'
    };
  }

  getTypesSummary(p: ProduitConseil): string {
    if (!p.typesCheveuxCibles || p.typesCheveuxCibles.length === 0) return 'Tous types';
    return p.typesCheveuxCibles
      .map((t) => TYPE_CHEVEUX_OPTIONS.find((o) => o.value === t)?.label || t)
      .join(', ');
  }
}
