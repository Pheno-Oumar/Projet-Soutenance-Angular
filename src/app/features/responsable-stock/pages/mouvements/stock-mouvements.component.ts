import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ResponsableStockService } from '../../services/responsable-stock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  MouvementStock,
  Produit,
  MouvementStockCreateDto
} from '../../../../shared/models';

@Component({
  selector: 'app-stock-mouvements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './stock-mouvements.component.html',
  styleUrl: './stock-mouvements.component.css'
})
export class StockMouvementsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly stockService = inject(ResponsableStockService);
  private readonly notificationService = inject(NotificationService);

  readonly mouvements = signal<MouvementStock[]>([]);
  readonly produits = signal<Produit[]>([]);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filtres
  searchQuery: string = '';
  typeFilter: string = 'TOUS'; // TOUS, ENTREE, VENTE, PERTE, AJUSTEMENT
  produitFilter: number | '' = '';

  // Modal Enregistrement Mouvement
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  mvtProduitId: number | null = null;
  mvtType: string = 'ENTREE';
  mvtQuantite: number = 10;
  mvtPrixUnitaire: number = 0;
  mvtMotif: string = '';

  ngOnInit(): void {
    this.chargerDonnees();
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

  chargerDonnees(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      mvtsRes: this.stockService.listerMouvements(slug, this.produitFilter ? Number(this.produitFilter) : undefined),
      prodsRes: this.stockService.listerProduits(slug)
    }).subscribe({
      next: ({ mvtsRes, prodsRes }) => {
        this.isLoading.set(false);
        if (mvtsRes.success && mvtsRes.data) {
          this.mouvements.set(mvtsRes.data);
        }
        if (prodsRes.success && prodsRes.data) {
          this.produits.set(prodsRes.data);
          if (prodsRes.data.length > 0 && !this.mvtProduitId) {
            this.mvtProduitId = prodsRes.data[0].id;
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des mouvements de stock.');
      }
    });
  }

  onProduitFilterChange(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.stockService.listerMouvements(slug, this.produitFilter ? Number(this.produitFilter) : undefined).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.mouvements.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de la filtration des mouvements');
      }
    });
  }

  get filteredMouvements(): MouvementStock[] {
    return this.mouvements().filter(m => {
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchesNom = m.produitNom.toLowerCase().includes(q);
        const matchesMotif = m.motif ? m.motif.toLowerCase().includes(q) : false;
        const matchesAuteur = m.auteurNom ? m.auteurNom.toLowerCase().includes(q) : false;
        if (!matchesNom && !matchesMotif && !matchesAuteur) return false;
      }
      if (this.typeFilter !== 'TOUS' && m.type !== this.typeFilter) return false;
      return true;
    });
  }

  ouvrirModalCreation(): void {
    if (this.produits().length === 0) {
      this.notificationService.warning('Veuillez d’abord enregistrer des produits dans le catalogue.');
      return;
    }
    this.mvtProduitId = this.produits()[0].id;
    this.mvtType = 'ENTREE';
    this.mvtQuantite = 10;
    this.mvtPrixUnitaire = Math.round(this.produits()[0].prixVente * 0.6);
    this.mvtMotif = '';
    this.isCreateModalOpen.set(true);
  }

  fermerModalCreation(): void {
    this.isCreateModalOpen.set(false);
  }

  onSelectProduitModal(event: Event): void {
    const pId = Number((event.target as HTMLSelectElement).value);
    const prod = this.produits().find(p => p.id === pId);
    if (prod) {
      this.mvtPrixUnitaire = Math.round(prod.prixVente * 0.6);
    }
  }

  validerCreation(): void {
    const slug = this.slugSalon;
    if (!slug || !this.mvtProduitId) return;

    if (this.mvtQuantite <= 0) {
      this.notificationService.warning('La quantité doit être supérieure à 0.');
      return;
    }

    const payload: MouvementStockCreateDto = {
      produitId: this.mvtProduitId,
      quantite: this.mvtQuantite,
      type: this.mvtType,
      prixUnitaire: this.mvtType === 'ENTREE' && this.mvtPrixUnitaire > 0 ? this.mvtPrixUnitaire : undefined,
      motif: this.mvtMotif.trim() || undefined
    };

    this.isSubmitting.set(true);
    this.stockService.enregistrerMouvement(slug, payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.fermerModalCreation();
        const msg = `Flux « ${res.data?.type} » enregistré avec succès.`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errDesc = err.error?.message || 'Erreur lors de l’enregistrement du mouvement de stock';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'ENTREE': return 'badge-entree';
      case 'VENTE': return 'badge-vente';
      case 'PERTE': return 'badge-perte';
      case 'AJUSTEMENT': return 'badge-ajustement';
      default: return 'badge-default';
    }
  }

  formatMontant(val?: number): string {
    if (val === undefined || val === null) return '0 FCFA';
    return `${new Intl.NumberFormat('fr-FR').format(val)} FCFA`;
  }
}
