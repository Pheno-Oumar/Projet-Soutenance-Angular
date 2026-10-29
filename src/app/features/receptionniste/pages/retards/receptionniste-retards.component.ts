import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReceptionnisteService } from '../../services/receptionniste.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RetardRendezVous, RetardTraitementDto } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-receptionniste-retards',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './receptionniste-retards.component.html',
  styleUrl: './receptionniste-retards.component.css'
})
export class ReceptionnisteRetardsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly receptionnisteService = inject(ReceptionnisteService);
  private readonly notificationService = inject(NotificationService);

  readonly retardsActifs = signal<RetardRendezVous[]>([]);
  readonly historiqueRetards = signal<RetardRendezVous[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Onglet actif : 'actifs' | 'historique'
  activeTab: 'actifs' | 'historique' = 'actifs';

  // Modal de traitement
  readonly isTraitementModalOpen = signal<boolean>(false);
  selectedRetard: RetardRendezVous | null = null;
  traitementDto: RetardTraitementDto = {
    action: 'DECALER',
    minutesDecalage: 15,
    motif: ''
  };
  readonly isSubmittingTraitement = signal<boolean>(false);

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

    if (this.activeTab === 'actifs') {
      this.receptionnisteService.listerRendezVousEnRetard(slug).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.success && res.data) {
            this.retardsActifs.set(res.data);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Erreur lors du chargement des retards actifs';
          this.errorMessage.set(msg);
          this.notificationService.error(msg, 'Retards');
        }
      });
    } else {
      this.receptionnisteService.listerHistoriqueRetards(slug).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.success && res.data) {
            this.historiqueRetards.set(res.data);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Erreur lors du chargement de l’historique des retards';
          this.errorMessage.set(msg);
          this.notificationService.error(msg, 'Historique Retards');
        }
      });
    }
  }

  changerOnglet(tab: 'actifs' | 'historique'): void {
    this.activeTab = tab;
    this.chargerDonnees();
  }

  ouvrirModalTraitement(retard: RetardRendezVous): void {
    this.selectedRetard = retard;
    this.traitementDto = {
      action: 'DECALER',
      minutesDecalage: 15,
      motif: ''
    };
    this.isTraitementModalOpen.set(true);
  }

  fermerModalTraitement(): void {
    this.selectedRetard = null;
    this.isTraitementModalOpen.set(false);
  }

  validerTraitement(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedRetard) return;

    // Validation NO_SHOW
    if (this.traitementDto.action === 'NO_SHOW' && this.selectedRetard.minutesRetard < 15) {
      const msg = 'Le statut NO_SHOW exige au moins 15 minutes de retard effectif.';
      this.errorMessage.set(msg);
      this.notificationService.warning(msg, 'Traitement Retard');
      return;
    }

    this.isSubmittingTraitement.set(true);
    this.errorMessage.set(null);

    this.receptionnisteService.traiterRetard(slug, this.selectedRetard.rdvId, this.traitementDto).subscribe({
      next: () => {
        this.isSubmittingTraitement.set(false);
        this.fermerModalTraitement();
        const actionLabel = this.traitementDto.action === 'NO_SHOW' ? 'marqué comme No-Show' : 'décalé';
        const msg = `Le rendez-vous a été ${actionLabel} avec succès.`;
        this.successMessage.set(msg);
        this.notificationService.success(msg, 'Retard Traité');
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingTraitement.set(false);
        const errMsg = err.error?.message || 'Erreur lors du traitement du retard';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }
}
