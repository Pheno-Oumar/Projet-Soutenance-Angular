import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ManagerService } from '../../services/manager.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  PlanningRendezVous,
  Indisponibilite,
  IndisponibiliteDto,
  ProfilCoiffeur
} from '../../../../shared/models';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manager-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './manager-planning.component.html',
  styleUrl: './manager-planning.component.css'
})
export class ManagerPlanningComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly managerService = inject(ManagerService);
  private readonly notificationService = inject(NotificationService);

  readonly appointments = signal<PlanningRendezVous[]>([]);
  readonly indisponibilites = signal<Indisponibilite[]>([]);
  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Active view tab: 'PLANNING' | 'INDISPONIBILITES'
  activeTab: 'PLANNING' | 'INDISPONIBILITES' = 'PLANNING';

  // Planning filters
  selectedDate: string = new Date().toISOString().split('T')[0];
  filterCoiffeurId: number | null = null; // Affectation ID

  // --- MODAL: Créer Indisponibilité ---
  showCreateIndispoModal = false;
  isCreatingIndispo = false;
  newIndispo: IndisponibiliteDto = {
    coiffeurAffectationId: undefined,
    dateDebut: '',
    dateFin: '',
    motif: 'Congé',
    commentaire: ''
  };

  // --- MODAL: Modifier Indisponibilité ---
  showEditIndispoModal = false;
  isUpdatingIndispo = false;
  selectedIndispoForEdit: Indisponibilite | null = null;
  editIndispoData: IndisponibiliteDto = {
    coiffeurAffectationId: undefined,
    dateDebut: '',
    dateFin: '',
    motif: '',
    commentaire: ''
  };

  ngOnInit(): void {
    this.chargerCoiffeurs();
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

  chargerCoiffeurs(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.managerService.listerCoiffeurs(slug).subscribe({
      next: (res) => {
        if (res?.data) {
          this.coiffeurs.set(res.data);
        }
      },
      error: () => {}
    });
  }

  getCoiffeurNom(affectationId?: number): string {
    if (!affectationId) return 'Collaborateur';
    const c = this.coiffeurs().find((item) => item.affectationId === affectationId);
    return c ? `${c.coiffeurPrenom} ${c.coiffeurNom}` : `Coiffeur #${affectationId}`;
  }

  chargerDonnees(): void {
    if (this.activeTab === 'PLANNING') {
      this.chargerPlanning();
    } else {
      this.chargerIndisponibilites();
    }
  }

  chargerPlanning(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);

    const coiffeurId = this.filterCoiffeurId || undefined;
    this.managerService.getPlanning(slug, this.selectedDate, coiffeurId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.appointments.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement du planning.', 'Planning');
      }
    });
  }

  chargerIndisponibilites(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);

    const coiffeurId = this.filterCoiffeurId || undefined;
    this.managerService.listerIndisponibilites(slug, coiffeurId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.indisponibilites.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement des indisponibilités.', 'Indisponibilités');
      }
    });
  }

  setAujourdhui(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.chargerPlanning();
  }

  formatHeure(isoString: string): string {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatDevise(val?: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }

  // --- ACTIONS INDISPONIBILITÉS ---
  openCreateIndispoModal(): void {
    const now = new Date();
    const demain = new Date(now);
    demain.setDate(demain.getDate() + 1);

    const defaultAffectation = this.filterCoiffeurId || (this.coiffeurs().length > 0 ? this.coiffeurs()[0].affectationId : undefined);

    this.newIndispo = {
      coiffeurAffectationId: defaultAffectation,
      dateDebut: now.toISOString().slice(0, 16),
      dateFin: demain.toISOString().slice(0, 16),
      motif: 'Congé',
      commentaire: ''
    };
    this.showCreateIndispoModal = true;
  }

  creerIndisponibilite(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.newIndispo.coiffeurAffectationId || !this.newIndispo.dateDebut || !this.newIndispo.dateFin) {
      this.notificationService.error('Veuillez sélectionner un coiffeur et définir la période d’indisponibilité.', 'Champs requis');
      return;
    }

    this.isCreatingIndispo = true;
    this.managerService.creerIndisponibilite(slug, this.newIndispo).subscribe({
      next: () => {
        this.isCreatingIndispo = false;
        this.showCreateIndispoModal = false;
        this.notificationService.success('Indisponibilité enregistrée avec succès.', 'Succès');
        this.chargerIndisponibilites();
      },
      error: (err) => {
        this.isCreatingIndispo = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la déclaration de l’indisponibilité.', 'Erreur');
      }
    });
  }

  openEditIndispoModal(indispo: Indisponibilite): void {
    this.selectedIndispoForEdit = indispo;
    this.editIndispoData = {
      coiffeurAffectationId: indispo.coiffeurAffectationId,
      dateDebut: indispo.dateDebut ? indispo.dateDebut.slice(0, 16) : '',
      dateFin: indispo.dateFin ? indispo.dateFin.slice(0, 16) : '',
      motif: indispo.motif || '',
      commentaire: indispo.commentaire || ''
    };
    this.showEditIndispoModal = true;
  }

  modifierIndisponibilite(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedIndispoForEdit) return;

    this.isUpdatingIndispo = true;
    this.managerService.modifierIndisponibilite(slug, this.selectedIndispoForEdit.id, this.editIndispoData).subscribe({
      next: () => {
        this.isUpdatingIndispo = false;
        this.showEditIndispoModal = false;
        this.notificationService.success('Indisponibilité mise à jour.', 'Succès');
        this.chargerIndisponibilites();
      },
      error: (err) => {
        this.isUpdatingIndispo = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la mise à jour.', 'Erreur');
      }
    });
  }

  supprimerIndisponibilite(indispo: Indisponibilite): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette indisponibilité ?')) {
      return;
    }

    this.managerService.supprimerIndisponibilite(slug, indispo.id).subscribe({
      next: () => {
        this.notificationService.success('Indisponibilité supprimée.', 'Suppression confirmée');
        this.chargerIndisponibilites();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Impossible de supprimer cette indisponibilité.', 'Erreur');
      }
    });
  }
}
