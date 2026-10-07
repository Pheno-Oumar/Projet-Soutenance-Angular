import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Indisponibilite, IndisponibiliteDto, Employe } from '../../../../shared/models';

const MOTIFS = [
  { key: 'CONGE', label: 'Congé annuel / payé' },
  { key: 'MALADIE', label: 'Arrêt maladie' },
  { key: 'ABSENCE', label: 'Absence autorisée / urgente' },
  { key: 'AUTRE', label: 'Autre motif' }
];

@Component({
  selector: 'app-proprietaire-indisponibilites',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-indisponibilites.component.html',
  styleUrl: './proprietaire-indisponibilites.component.css'
})
export class ProprietaireIndisponibilitesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly notificationService = inject(NotificationService);

  readonly indisponibilites = signal<Indisponibilite[]>([]);
  readonly coiffeurs = signal<Employe[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  selectedCoiffeurFilter: number | null = null;
  readonly motifs = MOTIFS;

  // Modal State
  showModal = false;
  isEditMode = false;
  selectedId: number | null = null;
  isSubmitting = false;

  formData: IndisponibiliteDto = {
    coiffeurAffectationId: undefined,
    dateDebut: '',
    dateFin: '',
    motif: 'CONGE',
    commentaire: ''
  };

  ngOnInit(): void {
    this.chargerCoiffeurs();
    this.chargerIndisponibilites();
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

    this.proprietaireService.listerEmployes(slug).subscribe({
      next: (res) => {
        if (res?.data) {
          // Filtrer les coiffeurs
          this.coiffeurs.set(res.data.filter(e => e.roles && e.roles.includes('COIFFEUR')));
        }
      },
      error: () => {}
    });
  }

  chargerIndisponibilites(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filterId = this.selectedCoiffeurFilter ? Number(this.selectedCoiffeurFilter) : undefined;

    this.proprietaireService.listerIndisponibilites(slug, filterId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.indisponibilites.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors de la récupération des indisponibilités.');
      }
    });
  }

  getCoiffeurNom(affectationId: number): string {
    const c = this.coiffeurs().find(emp => emp.affectationId === affectationId);
    return c ? `${c.prenom} ${c.nom}` : `Coiffeur #${affectationId}`;
  }

  getStatut(i: Indisponibilite): 'EN_COURS' | 'A_VENIR' | 'PASSEE' {
    const now = new Date().toISOString();
    if (i.dateDebut > now) return 'A_VENIR';
    if (i.dateFin < now) return 'PASSEE';
    return 'EN_COURS';
  }

  canModifyOrDelete(i: Indisponibilite): boolean {
    const now = new Date().toISOString();
    return i.dateDebut > now;
  }

  canEndEarly(i: Indisponibilite): boolean {
    return this.getStatut(i) === 'EN_COURS';
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedId = null;

    const premierCoiffeur = this.coiffeurs().length > 0 ? this.coiffeurs()[0].affectationId : undefined;
    const nowIso = new Date().toISOString().slice(0, 16);

    this.formData = {
      coiffeurAffectationId: premierCoiffeur,
      dateDebut: nowIso,
      dateFin: nowIso,
      motif: 'CONGE',
      commentaire: ''
    };
    this.showModal = true;
  }

  openEditModal(i: Indisponibilite): void {
    this.isEditMode = true;
    this.selectedId = i.id;
    this.formData = {
      coiffeurAffectationId: i.coiffeurAffectationId,
      dateDebut: i.dateDebut ? i.dateDebut.slice(0, 16) : '',
      dateFin: i.dateFin ? i.dateFin.slice(0, 16) : '',
      motif: i.motif || 'CONGE',
      commentaire: i.commentaire || ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isSubmitting = false;
  }

  soumettre(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.formData.coiffeurAffectationId) {
      this.notificationService.error('Veuillez sélectionner un coiffeur.', 'Champs requis');
      return;
    }

    if (!this.formData.dateDebut || !this.formData.dateFin) {
      this.notificationService.error('Veuillez renseigner les dates et heures de début et fin.', 'Champs requis');
      return;
    }

    if (this.formData.dateDebut >= this.formData.dateFin) {
      this.notificationService.error('La date de début doit être antérieure à la date de fin.', 'Dates invalides');
      return;
    }

    this.isSubmitting = true;

    // S'assurer du format ISO complet (ex: 2026-09-25T14:30:00)
    const formatIso = (val: string) => val.length === 16 ? `${val}:00` : val;

    const payload: IndisponibiliteDto = {
      coiffeurAffectationId: Number(this.formData.coiffeurAffectationId),
      dateDebut: formatIso(this.formData.dateDebut),
      dateFin: formatIso(this.formData.dateFin),
      motif: this.formData.motif,
      commentaire: this.formData.commentaire
    };

    if (this.isEditMode && this.selectedId) {
      this.proprietaireService.modifierIndisponibilite(slug, this.selectedId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.notificationService.success('L’indisponibilité a été modifiée avec succès.', 'Modifiée');
          this.chargerIndisponibilites();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notificationService.error(err?.error?.message || 'Erreur lors de la modification de l’indisponibilité.', 'Erreur');
        }
      });
    } else {
      this.proprietaireService.creerIndisponibilite(slug, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.notificationService.success('L’indisponibilité a été enregistrée avec succès.', 'Enregistrée');
          this.chargerIndisponibilites();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notificationService.error(err?.error?.message || 'Erreur lors de la création de l’indisponibilité.', 'Erreur');
        }
      });
    }
  }

  mettreFin(i: Indisponibilite): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!confirm('Clôturer cette indisponibilité dès maintenant ? Le coiffeur sera à nouveau disponible dès cet instant.')) {
      return;
    }

    this.proprietaireService.mettreFinIndisponibilite(slug, i.id).subscribe({
      next: () => {
        this.notificationService.success('L’indisponibilité a été clôturée immédiatement.', 'Coiffeur disponible');
        this.chargerIndisponibilites();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Impossible de mettre fin à l’indisponibilité.', 'Erreur');
      }
    });
  }

  supprimer(i: Indisponibilite): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.canModifyOrDelete(i)) {
      this.notificationService.error('Seules les indisponibilités futures peuvent être supprimées.', 'Action non permise');
      return;
    }

    if (!confirm('Supprimer définitivement cette indisponibilité ?')) {
      return;
    }

    this.proprietaireService.supprimerIndisponibilite(slug, i.id).subscribe({
      next: () => {
        this.notificationService.success('L’indisponibilité a été supprimée.', 'Supprimée');
        this.chargerIndisponibilites();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Erreur lors de la suppression de l’indisponibilité.', 'Erreur');
      }
    });
  }
}
