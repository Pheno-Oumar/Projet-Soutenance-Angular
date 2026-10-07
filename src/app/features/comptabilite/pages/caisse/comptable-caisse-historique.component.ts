import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ComptableService } from '../../services/comptable.service';
import { SessionCaisse, OperationCaisse } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-comptable-caisse-historique',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './comptable-caisse-historique.component.html',
  styleUrl: './comptable-caisse-historique.component.css'
})
export class ComptableCaisseHistoriqueComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly comptableService = inject(ComptableService);

  readonly sessions = signal<SessionCaisse[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Modal Opérations d'une session sélectionnée
  showOperationsModal = false;
  selectedSession: SessionCaisse | null = null;
  operations = signal<OperationCaisse[]>([]);
  isLoadingOperations = false;

  ngOnInit(): void {
    this.chargerHistorique();
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

  chargerHistorique(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.comptableService.getHistoriqueSessions(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.sessions.set(res.data);
        } else {
          this.errorMessage.set(res.message || 'Impossible de récupérer l’historique des sessions');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement de l’historique');
      }
    });
  }

  voirOperations(session: SessionCaisse): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.selectedSession = session;
    this.showOperationsModal = true;
    this.isLoadingOperations = true;
    this.operations.set([]);

    this.comptableService.getOperationsSession(slug, session.id).subscribe({
      next: (res) => {
        this.isLoadingOperations = false;
        if (res.success && res.data) {
          this.operations.set(res.data);
        }
      },
      error: () => {
        this.isLoadingOperations = false;
      }
    });
  }

  fermerOperationsModal(): void {
    this.showOperationsModal = false;
    this.selectedSession = null;
  }

  calculerEcart(session: SessionCaisse): number {
    if (session.statut !== 'CLOTUREE' || session.soldeFermeture === undefined || session.soldeTheorique === undefined) {
      return 0;
    }
    return session.soldeFermeture - session.soldeTheorique;
  }
}
