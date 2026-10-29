import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ResponsableStockService } from '../../services/responsable-stock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ProduitAlerteStock,
  MouvementStockCreateDto
} from '../../../../shared/models';

@Component({
  selector: 'app-stock-alertes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './stock-alertes.component.html',
  styleUrl: './stock-alertes.component.css'
})
export class StockAlertesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly stockService = inject(ResponsableStockService);
  private readonly notificationService = inject(NotificationService);

  readonly Math = Math;

  readonly alertes = signal<ProduitAlerteStock[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filtres
  searchQuery: string = '';
  typeFiltre: string = 'TOUS'; // TOUS, RUPTURE, CRITIQUE

  // Modal Réapprovisionnement
  readonly isRestockModalOpen = signal<boolean>(false);
  readonly isSubmittingRestock = signal<boolean>(false);
  selectedAlerte: ProduitAlerteStock | null = null;
  restockQuantite: number = 10;
  restockPrixUnitaire: number = 0;
  restockMotif: string = '';

  ngOnInit(): void {
    this.chargerAlertes();
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

  chargerAlertes(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stockService.getProduitsBientotEnRupture(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.alertes.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des alertes de rupture.');
      }
    });
  }

  get totalRupturesTotales(): number {
    return this.alertes().filter(a => a.estEnRuptureTotale).length;
  }

  get totalStocksCritiques(): number {
    return this.alertes().filter(a => !a.estEnRuptureTotale).length;
  }

  get filteredAlertes(): ProduitAlerteStock[] {
    return this.alertes().filter(a => {
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchesNom = a.produitNom.toLowerCase().includes(q);
        const matchesCat = a.categorieNom.toLowerCase().includes(q);
        if (!matchesNom && !matchesCat) return false;
      }
      if (this.typeFiltre === 'RUPTURE' && !a.estEnRuptureTotale) return false;
      if (this.typeFiltre === 'CRITIQUE' && a.estEnRuptureTotale) return false;
      return true;
    });
  }

  ouvrirModalReappro(alerte: ProduitAlerteStock): void {
    this.selectedAlerte = alerte;
    this.restockQuantite = Math.max(10, (alerte.seuilMinimum || 5) * 2 - alerte.quantiteDisponible);
    this.restockPrixUnitaire = Math.round(alerte.prixVente * 0.6);
    this.restockMotif = `Commande d’urgence pour réapprovisionnement de ${alerte.produitNom}`;
    this.isRestockModalOpen.set(true);
  }

  fermerModalReappro(): void {
    this.isRestockModalOpen.set(false);
    this.selectedAlerte = null;
  }

  validerReappro(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedAlerte) return;

    if (this.restockQuantite <= 0) {
      this.notificationService.warning('La quantité à réapprovisionner doit être supérieure à 0.');
      return;
    }

    const payload: MouvementStockCreateDto = {
      produitId: this.selectedAlerte.produitId,
      quantite: this.restockQuantite,
      type: 'ENTREE',
      prixUnitaire: this.restockPrixUnitaire > 0 ? this.restockPrixUnitaire : undefined,
      motif: this.restockMotif.trim() || undefined
    };

    this.isSubmittingRestock.set(true);
    this.stockService.enregistrerMouvement(slug, payload).subscribe({
      next: () => {
        this.isSubmittingRestock.set(false);
        this.fermerModalReappro();
        const msg = `Entrée de stock (+${payload.quantite}) enregistrée avec succès.`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4500);
        this.chargerAlertes();
      },
      error: (err) => {
        this.isSubmittingRestock.set(false);
        const errDesc = err.error?.message || 'Erreur lors de l’enregistrement de l’entrée de stock';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  formatMontant(val?: number): string {
    if (val === undefined || val === null) return '0 FCFA';
    return `${new Intl.NumberFormat('fr-FR').format(val)} FCFA`;
  }
}
