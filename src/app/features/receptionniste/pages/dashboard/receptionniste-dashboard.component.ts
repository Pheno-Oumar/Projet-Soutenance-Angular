import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ReceptionnisteService } from '../../services/receptionniste.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReceptionnisteDashboard } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-receptionniste-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './receptionniste-dashboard.component.html',
  styleUrl: './receptionniste-dashboard.component.css'
})
export class ReceptionnisteDashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly receptionnisteService = inject(ReceptionnisteService);
  private readonly notificationService = inject(NotificationService);

  readonly dashboard = signal<ReceptionnisteDashboard | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Modal ouverture rapide caisse
  readonly isOuvertureCaisseModalOpen = signal<boolean>(false);
  soldeOuvertureInput = 50000;
  notesOuvertureInput = '';
  readonly isSubmittingCaisse = signal<boolean>(false);

  ngOnInit(): void {
    this.chargerDashboard();
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

  chargerDashboard(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.receptionnisteService.getDashboard(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.dashboard.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Erreur lors du chargement du tableau de bord réceptionniste';
        this.errorMessage.set(msg);
        this.notificationService.error(msg, 'Dashboard Réceptionniste');
      }
    });
  }

  ouvrirModalCaisse(): void {
    this.soldeOuvertureInput = 50000;
    this.notesOuvertureInput = '';
    this.isOuvertureCaisseModalOpen.set(true);
  }

  fermerModalCaisse(): void {
    this.isOuvertureCaisseModalOpen.set(false);
  }

  validerOuvertureCaisse(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (this.soldeOuvertureInput < 0) {
      this.notificationService.warning('Le fond de caisse initial ne peut pas être négatif.', 'Caisse');
      return;
    }

    this.isSubmittingCaisse.set(true);
    this.receptionnisteService.ouvrirSessionCaisse(slug, {
      soldeOuverture: this.soldeOuvertureInput,
      notes: this.notesOuvertureInput
    }).subscribe({
      next: () => {
        this.isSubmittingCaisse.set(false);
        this.fermerModalCaisse();
        const msg = 'La session de caisse quotidienne a été ouverte avec succès.';
        this.successMessage.set(msg);
        this.notificationService.success(msg, 'Caisse Ouverte');
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerDashboard();
      },
      error: (err) => {
        this.isSubmittingCaisse.set(false);
        const errMsg = err.error?.message || 'Impossible d’ouvrir la session de caisse';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur Caisse');
      }
    });
  }

  readonly isActionEnCours = signal<boolean>(false);

  terminerPrestationRapide(prestationId: number): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!confirm('Confirmez-vous que cette coupe/prestation est terminée et prête pour l’encaissement ?')) return;

    this.isActionEnCours.set(true);
    this.receptionnisteService.terminerPrestation(slug, prestationId).subscribe({
      next: () => {
        this.isActionEnCours.set(false);
        this.notificationService.success('Prestation terminée avec succès. Facture prête pour encaissement.', 'Prestation Terminée');
        this.chargerDashboard();
      },
      error: (err) => {
        this.isActionEnCours.set(false);
        const msg = err.error?.message || 'Erreur lors de la clôture de la prestation';
        this.notificationService.error(msg, 'Erreur');
      }
    });
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'CONFIRME':
      case 'OUVERTE':
      case 'TERMINEE':
        return 'badge-success';
      case 'EN_COURS':
        return 'badge-info';
      case 'NO_SHOW':
      case 'ANNULE':
      case 'ANNULEE':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }
}
