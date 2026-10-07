import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminSystemService } from '../../services/admin-system.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DemandeSuppression, StatutDemandeSuppression, DemandeSuppressionDecisionDto } from '../../../../shared/models';

@Component({
  selector: 'app-rgpd-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule],
  templateUrl: './rgpd-list.component.html',
  styleUrl: './rgpd-list.component.css'
})
export class RgpdListComponent implements OnInit {
  private readonly adminService = inject(AdminSystemService);
  private readonly notificationService = inject(NotificationService);

  readonly demandes = signal<DemandeSuppression[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filtreStatut = signal<StatutDemandeSuppression | undefined>(undefined);

  // Modal Decision
  readonly selectedDemande = signal<DemandeSuppression | null>(null);
  readonly decisionApproved = signal<boolean>(false);
  decisionMotif = '';
  readonly isProcessing = signal<boolean>(false);

  ngOnInit(): void {
    this.chargerDemandes();
  }

  chargerDemandes(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.listerDemandesSuppression(this.filtreStatut()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.demandes.set(res.data || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des demandes RGPD.');
      }
    });
  }

  changerFiltre(statut?: StatutDemandeSuppression): void {
    this.filtreStatut.set(statut);
    this.chargerDemandes();
  }

  totalDemandes = computed(() => this.demandes().length);
  countEnAttente = computed(() => this.demandes().filter((d) => d.statut === 'EN_ATTENTE').length);
  countApprouvees = computed(() => this.demandes().filter((d) => d.statut === 'APPROUVEE').length);
  countRejetees = computed(() => this.demandes().filter((d) => d.statut === 'REJETEE').length);

  ouvrirDecisionModal(demande: DemandeSuppression, approved: boolean): void {
    this.selectedDemande.set(demande);
    this.decisionApproved.set(approved);
    this.decisionMotif = '';
  }

  validerDecision(): void {
    const d = this.selectedDemande();
    if (!d) return;

    this.isProcessing.set(true);
    const dto: DemandeSuppressionDecisionDto = {
      approuvee: this.decisionApproved(),
      motifDecision: this.decisionMotif.trim() || undefined
    };

    this.adminService.traiterDemandeSuppression(d.id, dto).subscribe({
      next: (res) => {
        this.isProcessing.set(false);
        this.selectedDemande.set(null);
        this.chargerDemandes();
        this.notificationService.success(
          `La demande de ${d.compteEmail} a été traitée avec succès.`,
          'Demande Traitée'
        );
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.notificationService.error(
          err?.error?.message || 'Erreur lors du traitement de la demande.',
          'Action Échouée'
        );
      }
    });
  }

  getStatutClass(statut: StatutDemandeSuppression): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'badge-en-attente';
      case 'APPROUVEE': return 'badge-approuvee';
      case 'REJETEE': return 'badge-rejetee';
      default: return '';
    }
  }

  getStatutLabel(statut: StatutDemandeSuppression): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'En Attente';
      case 'APPROUVEE': return 'Approuvée';
      case 'REJETEE': return 'Rejetée';
      default: return statut;
    }
  }

  getPlaceholder(): string {
    return this.decisionApproved()
      ? "Ex: Demande légitime validée par l'administration..."
      : "Veuillez préciser la raison du rejet (obligations légales de conservation, etc.)...";
  }
}
