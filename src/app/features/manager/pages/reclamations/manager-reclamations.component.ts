import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ManagerService } from '../../services/manager.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Reclamation,
  ReclamationTraiterDto,
  StatutReclamation
} from '../../../../shared/models';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manager-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './manager-reclamations.component.html',
  styleUrl: './manager-reclamations.component.css'
})
export class ManagerReclamationsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly managerService = inject(ManagerService);
  private readonly notificationService = inject(NotificationService);

  readonly reclamations = signal<Reclamation[]>([]);
  readonly isLoading = signal<boolean>(false);

  filterStatut: StatutReclamation | 'TOUTES' = 'TOUTES';

  // --- MODAL: Traiter Réclamation ---
  showTraiterModal = false;
  isTraitementEnCours = false;
  selectedReclamation: Reclamation | null = null;
  traiterData: ReclamationTraiterDto = {
    nouveauStatut: 'RESOLUE',
    reponse: ''
  };

  ngOnInit(): void {
    this.chargerReclamations();
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

  get filteredReclamations(): Reclamation[] {
    const list = this.reclamations();
    if (this.filterStatut === 'TOUTES') return list;
    return list.filter((r) => r.statut === this.filterStatut);
  }

  chargerReclamations(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);

    const statutParam = this.filterStatut !== 'TOUTES' ? this.filterStatut : undefined;
    this.managerService.listerReclamations(slug, statutParam).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.reclamations.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement des réclamations.', 'Erreur');
      }
    });
  }

  ouvrirTraiterModal(rec: Reclamation): void {
    this.selectedReclamation = rec;
    this.traiterData = {
      nouveauStatut: 'RESOLUE',
      reponse: ''
    };
    this.showTraiterModal = true;
  }

  traiterReclamation(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedReclamation) return;

    if (!this.traiterData.reponse.trim()) {
      this.notificationService.error('Veuillez formuler une réponse détaillée pour le client.', 'Réponse requise');
      return;
    }

    this.isTraitementEnCours = true;
    this.managerService.traiterReclamation(slug, this.selectedReclamation.id, this.traiterData).subscribe({
      next: () => {
        this.isTraitementEnCours = false;
        this.showTraiterModal = false;
        this.notificationService.success(
          this.traiterData.nouveauStatut === 'RESOLUE'
            ? 'La réclamation a été marquée comme résolue.'
            : 'La réclamation a été rejetée avec notification au client.',
          'Réclamation traitée'
        );
        this.chargerReclamations();
      },
      error: (err) => {
        this.isTraitementEnCours = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors du traitement.', 'Erreur');
      }
    });
  }
}
