import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CoiffeurService } from '../../services/coiffeur.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Indisponibilite, IndisponibiliteDto } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-coiffeur-indisponibilites',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './coiffeur-indisponibilites.component.html',
  styleUrl: './coiffeur-indisponibilites.component.css'
})
export class CoiffeurIndisponibilitesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly coiffeurService = inject(CoiffeurService);
  private readonly notificationService = inject(NotificationService);

  readonly indisponibilites = signal<Indisponibilite[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Modal création
  showCreateModal = false;
  isSubmitting = false;
  newIndispo: IndisponibiliteDto = {
    dateDebut: '',
    dateFin: '',
    motif: 'CONGE',
    commentaire: ''
  };
  modalError: string | null = null;

  // Filter: 'all', 'upcoming', 'past'
  filterMode: 'all' | 'upcoming' | 'past' = 'all';

  ngOnInit(): void {
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

  chargerIndisponibilites(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.coiffeurService.listerIndisponibilites(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.indisponibilites.set(res.data);
        } else {
          this.errorMessage.set(res.message || 'Impossible de récupérer vos indisponibilités');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des indisponibilités');
      }
    });
  }

  get filteredIndisponibilites(): Indisponibilite[] {
    const now = new Date().toISOString();
    return this.indisponibilites().filter((ind) => {
      if (this.filterMode === 'upcoming') {
        return ind.dateFin > now;
      } else if (this.filterMode === 'past') {
        return ind.dateFin <= now;
      }
      return true;
    });
  }

  ouvrirModalCreation(): void {
    // Proposer par défaut demain 08:00 à demain 18:00
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    const dateStr = demain.toISOString().split('T')[0];

    this.newIndispo = {
      dateDebut: `${dateStr}T08:00`,
      dateFin: `${dateStr}T18:00`,
      motif: 'CONGE',
      commentaire: ''
    };
    this.modalError = null;
    this.showCreateModal = true;
  }

  fermerModalCreation(): void {
    this.showCreateModal = false;
    this.modalError = null;
  }

  creerIndisponibilite(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.newIndispo.dateDebut || !this.newIndispo.dateFin) {
      this.modalError = 'Veuillez renseigner les dates de début et de fin.';
      return;
    }

    if (new Date(this.newIndispo.dateDebut) >= new Date(this.newIndispo.dateFin)) {
      this.modalError = 'La date de début doit être strictement antérieure à la date de fin.';
      return;
    }

    this.isSubmitting = true;
    this.modalError = null;

    this.coiffeurService.ajouterIndisponibilite(slug, this.newIndispo).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.showCreateModal = false;
          this.successMessage.set('Indisponibilité déclarée avec succès !');
          this.notificationService.success('Indisponibilité déclarée avec succès !');
          setTimeout(() => this.successMessage.set(null), 4000);
          this.chargerIndisponibilites();
        } else {
          const errMsg = res.message || 'Erreur lors de la création';
          this.modalError = errMsg;
          this.notificationService.error(errMsg);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        const errMsg = err.error?.message || 'Erreur lors de la déclaration de l’indisponibilité';
        this.modalError = errMsg;
        this.notificationService.error(errMsg);
      }
    });
  }

  supprimer(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette indisponibilité ?')) {
      return;
    }

    const slug = this.slugSalon;
    if (!slug) return;

    this.coiffeurService.supprimerIndisponibilite(slug, id).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage.set('Indisponibilité supprimée.');
          this.notificationService.success('Indisponibilité supprimée.');
          setTimeout(() => this.successMessage.set(null), 3000);
          this.chargerIndisponibilites();
        }
      },
      error: (err) => {
        this.notificationService.error(err.error?.message || 'Impossible de supprimer cette indisponibilité');
      }
    });
  }

  estFutur(dateDebut: string): boolean {
    return new Date(dateDebut) > new Date();
  }
}
