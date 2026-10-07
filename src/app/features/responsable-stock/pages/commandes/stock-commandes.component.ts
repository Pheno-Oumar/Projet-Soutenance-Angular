import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ResponsableStockService } from '../../services/responsable-stock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Commande,
  StatutCommande,
  RejetCommandeDto,
  RetraitCommandeDto
} from '../../../../shared/models';

@Component({
  selector: 'app-stock-commandes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './stock-commandes.component.html',
  styleUrl: './stock-commandes.component.css'
})
export class StockCommandesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly stockService = inject(ResponsableStockService);
  private readonly notificationService = inject(NotificationService);

  readonly commandes = signal<Commande[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filtres
  searchQuery: string = '';
  selectedStatutTab: string = 'TOUTES'; // TOUTES, EN_ATTENTE, VALIDEE, RECUPEREE, REJETEE, ANNULEE
  dateDebut: string = '';
  dateFin: string = '';

  // Modal Détail
  readonly isDetailModalOpen = signal<boolean>(false);
  selectedCommandeDetail: Commande | null = null;

  // Modal Rejet
  readonly isRejectModalOpen = signal<boolean>(false);
  readonly isSubmittingReject = signal<boolean>(false);
  commandeToReject: Commande | null = null;
  motifRejet: string = '';

  // Modal Confirmation Retrait
  readonly isRetraitModalOpen = signal<boolean>(false);
  readonly isSubmittingRetrait = signal<boolean>(false);
  commandeToRetrait: Commande | null = null;
  codeRetraitSaisi: string = '';

  ngOnInit(): void {
    this.chargerCommandes();
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

  chargerCommandes(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const statutParam = this.selectedStatutTab !== 'TOUTES' ? (this.selectedStatutTab as StatutCommande) : undefined;
    const debutParam = this.dateDebut ? this.dateDebut : undefined;
    const finParam = this.dateFin ? this.dateFin : undefined;

    this.stockService.listerCommandes(slug, statutParam, debutParam, finParam).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.commandes.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des commandes clients.');
      }
    });
  }

  setStatutTab(statut: string): void {
    this.selectedStatutTab = statut;
    this.chargerCommandes();
  }

  get filteredCommandes(): Commande[] {
    return this.commandes().filter(c => {
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchesNum = c.numeroCommande.toLowerCase().includes(q);
        const matchesNom = c.clientNom.toLowerCase().includes(q);
        const matchesEmail = c.clientEmail.toLowerCase().includes(q);
        const matchesCode = c.codeRetrait ? c.codeRetrait.toLowerCase().includes(q) : false;
        if (!matchesNum && !matchesNom && !matchesEmail && !matchesCode) return false;
      }
      return true;
    });
  }

  // --- ACTIONS COMMANDES ---

  ouvrirModalDetail(cmd: Commande): void {
    this.selectedCommandeDetail = cmd;
    this.isDetailModalOpen.set(true);
  }

  fermerModalDetail(): void {
    this.isDetailModalOpen.set(false);
    this.selectedCommandeDetail = null;
  }

  validerCommande(cmd: Commande): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!confirm(`Confirmer la validation de la commande ${cmd.numeroCommande} ? Les quantités seront déduites du stock et un code de retrait sera remis au client.`)) {
      return;
    }

    this.stockService.validerCommande(slug, cmd.id).subscribe({
      next: (res) => {
        const code = res.data?.codeRetrait || 'généré';
        this.successMessage.set(`Commande validée ! Code de retrait du client : ${code}`);
        setTimeout(() => this.successMessage.set(null), 7000);
        this.chargerCommandes();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Erreur lors de la validation de la commande');
      }
    });
  }

  // REJET
  ouvrirModalRejet(cmd: Commande): void {
    this.commandeToReject = cmd;
    this.motifRejet = '';
    this.isRejectModalOpen.set(true);
  }

  fermerModalRejet(): void {
    this.isRejectModalOpen.set(false);
    this.commandeToReject = null;
    this.motifRejet = '';
  }

  confirmerRejet(): void {
    const slug = this.slugSalon;
    if (!slug || !this.commandeToReject) return;

    if (!this.motifRejet.trim()) {
      this.notificationService.warning('Veuillez préciser le motif du rejet.');
      return;
    }

    const payload: RejetCommandeDto = { motif: this.motifRejet.trim() };

    this.isSubmittingReject.set(true);
    this.stockService.rejeterCommande(slug, this.commandeToReject.id, payload).subscribe({
      next: () => {
        this.isSubmittingReject.set(false);
        this.fermerModalRejet();
        const msg = 'La commande a été rejetée.';
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerCommandes();
      },
      error: (err) => {
        this.isSubmittingReject.set(false);
        const errDesc = err.error?.message || 'Erreur lors du rejet de la commande';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  // RETRAIT
  ouvrirModalRetrait(cmd: Commande): void {
    this.commandeToRetrait = cmd;
    this.codeRetraitSaisi = '';
    this.isRetraitModalOpen.set(true);
  }

  fermerModalRetrait(): void {
    this.isRetraitModalOpen.set(false);
    this.commandeToRetrait = null;
    this.codeRetraitSaisi = '';
  }

  confirmerRetrait(): void {
    const slug = this.slugSalon;
    if (!slug || !this.commandeToRetrait) return;

    if (!this.codeRetraitSaisi.trim()) {
      this.notificationService.warning('Veuillez saisir le code de retrait présenté par le client.');
      return;
    }

    const payload: RetraitCommandeDto = { codeRetrait: this.codeRetraitSaisi.trim() };

    this.isSubmittingRetrait.set(true);
    this.stockService.confirmerRetrait(slug, this.commandeToRetrait.id, payload).subscribe({
      next: () => {
        this.isSubmittingRetrait.set(false);
        this.fermerModalRetrait();
        const msg = 'Retrait de la commande confirmé ! Les articles ont été remis au client.';
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 5000);
        this.chargerCommandes();
      },
      error: (err) => {
        this.isSubmittingRetrait.set(false);
        const errDesc = err.error?.message || 'Code de retrait invalide ou erreur de validation';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'badge-attente';
      case 'VALIDEE': return 'badge-validee';
      case 'RECUPEREE': return 'badge-recuperee';
      case 'REJETEE': return 'badge-rejetee';
      case 'ANNULEE': return 'badge-annulee';
      default: return 'badge-default';
    }
  }

  formatMontant(val?: number): string {
    if (val === undefined || val === null) return '0 FCFA';
    return `${new Intl.NumberFormat('fr-FR').format(val)} FCFA`;
  }
}
