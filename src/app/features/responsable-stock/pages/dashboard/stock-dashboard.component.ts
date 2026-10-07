import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ResponsableStockService } from '../../services/responsable-stock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  KpiStock,
  ProduitAlerteStock,
  Commande,
  MouvementStock,
  MouvementStockCreateDto
} from '../../../../shared/models';

@Component({
  selector: 'app-stock-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './stock-dashboard.component.html',
  styleUrl: './stock-dashboard.component.css'
})
export class StockDashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stockService = inject(ResponsableStockService);
  private readonly notificationService = inject(NotificationService);

  readonly kpi = signal<KpiStock | null>(null);
  readonly alertes = signal<ProduitAlerteStock[]>([]);
  readonly commandesEnAttente = signal<Commande[]>([]);
  readonly derniersMouvements = signal<MouvementStock[]>([]);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Modal Réapprovisionnement rapide
  readonly isRestockModalOpen = signal<boolean>(false);
  readonly isSubmittingRestock = signal<boolean>(false);
  selectedAlerte: ProduitAlerteStock | null = null;
  restockQuantite: number = 10;
  restockPrixUnitaire: number = 0;
  restockMotif: string = 'Réapprovisionnement suite alerte de stock';

  // Modal Rejet commande rapide
  readonly isRejectModalOpen = signal<boolean>(false);
  readonly isSubmittingReject = signal<boolean>(false);
  selectedCommandeToReject: Commande | null = null;
  motifRejet: string = '';

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
      kpiRes: this.stockService.getKpiStock(slug),
      alertesRes: this.stockService.getProduitsBientotEnRupture(slug),
      commandesRes: this.stockService.listerCommandes(slug, 'EN_ATTENTE'),
      mouvementsRes: this.stockService.listerMouvements(slug)
    }).subscribe({
      next: ({ kpiRes, alertesRes, commandesRes, mouvementsRes }) => {
        this.isLoading.set(false);
        if (kpiRes.success && kpiRes.data) {
          this.kpi.set(kpiRes.data);
        }
        if (alertesRes.success && alertesRes.data) {
          this.alertes.set(alertesRes.data);
        }
        if (commandesRes.success && commandesRes.data) {
          this.commandesEnAttente.set(commandesRes.data.slice(0, 5));
        }
        if (mouvementsRes.success && mouvementsRes.data) {
          this.derniersMouvements.set(mouvementsRes.data.slice(0, 6));
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des indicateurs de stock.');
      }
    });
  }

  // --- ACTIONS RAPIDES RÉAPPROVISIONNEMENT ---

  ouvrirModalReappro(alerte: ProduitAlerteStock): void {
    this.selectedAlerte = alerte;
    this.restockQuantite = Math.max(10, (alerte.seuilMinimum || 5) * 2 - alerte.quantiteDisponible);
    this.restockPrixUnitaire = Math.round(alerte.prixVente * 0.6);
    this.restockMotif = `Réapprovisionnement express pour ${alerte.produitNom}`;
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
      this.notificationService.warning('Veuillez saisir une quantité supérieure à 0');
      return;
    }

    const payload: MouvementStockCreateDto = {
      produitId: this.selectedAlerte.produitId,
      quantite: this.restockQuantite,
      type: 'ENTREE',
      prixUnitaire: this.restockPrixUnitaire > 0 ? this.restockPrixUnitaire : undefined,
      motif: this.restockMotif
    };

    this.isSubmittingRestock.set(true);
    this.stockService.enregistrerMouvement(slug, payload).subscribe({
      next: (res) => {
        this.isSubmittingRestock.set(false);
        this.fermerModalReappro();
        const msg = `Stock réapprovisionné avec succès pour ${payload.quantite} unité(s).`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4500);
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingRestock.set(false);
        const errDesc = err.error?.message || 'Échec du réapprovisionnement';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  // --- ACTIONS RAPIDES COMMANDES CLIENTS ---

  validerCommande(cmd: Commande): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!confirm(`Valider la commande ${cmd.numeroCommande} de ${cmd.clientNom} ? Le stock sera automatiquement déduit.`)) {
      return;
    }

    this.stockService.validerCommande(slug, cmd.id).subscribe({
      next: (res) => {
        const code = res.data?.codeRetrait || 'généré';
        const msg = `Commande ${cmd.numeroCommande} validée ! Code de retrait : ${code}`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 6000);
        this.chargerDonnees();
      },
      error: (err) => {
        const errDesc = err.error?.message || 'Erreur lors de la validation de la commande';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  ouvrirModalRejet(cmd: Commande): void {
    this.selectedCommandeToReject = cmd;
    this.motifRejet = '';
    this.isRejectModalOpen.set(true);
  }

  fermerModalRejet(): void {
    this.isRejectModalOpen.set(false);
    this.selectedCommandeToReject = null;
    this.motifRejet = '';
  }

  confirmerRejet(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedCommandeToReject) return;

    if (!this.motifRejet.trim()) {
      this.notificationService.warning('Veuillez préciser le motif du rejet.');
      return;
    }

    this.isSubmittingReject.set(true);
    this.stockService.rejeterCommande(slug, this.selectedCommandeToReject.id, { motif: this.motifRejet }).subscribe({
      next: () => {
        this.isSubmittingReject.set(false);
        this.fermerModalRejet();
        const msg = 'La commande a été rejetée et le client a été notifié.';
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingReject.set(false);
        const errDesc = err.error?.message || 'Erreur lors du rejet de la commande';
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
