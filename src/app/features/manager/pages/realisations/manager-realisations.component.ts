import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ManagerService } from '../../services/manager.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Realisation,
  RealisationCreateDto,
  ProfilCoiffeur,
  CommentaireRealisation
} from '../../../../shared/models';
import { HlsVideoDirective } from '../../../../shared/directives/hls-video.directive';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manager-realisations',
  standalone: true,
  imports: [CommonModule, FormsModule, HlsVideoDirective, MatIconModule],
  templateUrl: './manager-realisations.component.html',
  styleUrl: './manager-realisations.component.css'
})
export class ManagerRealisationsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly managerService = inject(ManagerService);
  private readonly notificationService = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly realisations = signal<Realisation[]>([]);
  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly commentaires = signal<CommentaireRealisation[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingComments = signal<boolean>(false);

  // Active view tab: 'VIDEOS' | 'COMMENTAIRES'
  activeTab: 'VIDEOS' | 'COMMENTAIRES' = 'VIDEOS';

  // Filters
  filterStatut: boolean | null = null; // null = tous, true = publiées, false = non publiées
  filterCommentStatut: 'TOUS' | 'ACTIF' | 'MASQUE' = 'TOUS';

  // --- MODAL: Créer Réalisation ---
  showCreateModal = false;
  isCreating = false;
  newRealisation: RealisationCreateDto = {
    titre: '',
    description: '',
    coiffeurId: undefined,
    dateRealisation: new Date().toISOString().split('T')[0],
    publierImmediatement: true
  };
  newVideoFile: File | null = null;
  videoFileName: string | null = null;
  newVideoPreviewUrl: string | null = null;


  // --- MODAL: Lecture Vidéo ---
  showPlayerModal = false;
  playingRealisation: Realisation | null = null;

  // --- MODAL: Suppression Réalisation ---
  showDeleteModal = false;
  isDeleting = false;
  realisationToDelete: Realisation | null = null;

  // --- MODAL: Suppression Commentaire ---
  showDeleteCommentModal = false;
  isDeletingComment = false;
  commentToDelete: CommentaireRealisation | null = null;

  ngOnInit(): void {
    this.chargerRealisations();
    this.chargerCoiffeurs();
    this.chargerCommentaires();
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

  get filteredRealisations(): Realisation[] {
    const list = this.realisations();
    if (this.filterStatut === null) return list;
    return list.filter((r) => r.statutPublication === this.filterStatut);
  }

  get filteredCommentaires(): CommentaireRealisation[] {
    const list = this.commentaires();
    if (this.filterCommentStatut === 'TOUS') return list;
    return list.filter((c) => c.statut === this.filterCommentStatut);
  }

  chargerRealisations(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);

    this.managerService.listerRealisations(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.realisations.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement des réalisations.', 'Erreur');
      }
    });
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
      error: () => {
        // Fallback silencieux, coiffeurs restera vide ou réessayé
      }
    });
  }

  chargerCommentaires(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoadingComments.set(true);
    this.managerService.listerCommentairesSalon(slug).subscribe({
      next: (res) => {
        this.isLoadingComments.set(false);
        this.commentaires.set(res || []);
      },
      error: (err) => {
        this.isLoadingComments.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement des commentaires.', 'Commentaires');
      }
    });
  }

  // --- CRÉATION ---
  openCreateModal(): void {
    this.newRealisation = {
      titre: '',
      description: '',
      coiffeurId: undefined,
      dateRealisation: new Date().toISOString().split('T')[0],
      publierImmediatement: true
    };
    if (this.newVideoPreviewUrl) {
      URL.revokeObjectURL(this.newVideoPreviewUrl);
    }
    this.newVideoPreviewUrl = null;
    this.newVideoFile = null;
    this.videoFileName = null;
    this.showCreateModal = true;
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!file.type.startsWith('video/')) {
        this.notificationService.error('Veuillez sélectionner un fichier vidéo valide (MP4, WebM, QuickTime).', 'Format incorrect');
        return;
      }
      this.newVideoFile = file;
      this.videoFileName = file.name;
      if (this.newVideoPreviewUrl) {
        URL.revokeObjectURL(this.newVideoPreviewUrl);
      }
      this.newVideoPreviewUrl = URL.createObjectURL(file);
      this.cdr.detectChanges();
    }
  }

  creerRealisation(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.newRealisation.titre.trim()) {
      this.notificationService.error('Le titre de la réalisation est obligatoire.', 'Champ requis');
      return;
    }

    if (!this.newVideoFile) {
      this.notificationService.error('Une vidéo est obligatoirement requise pour créer une réalisation.', 'Vidéo obligatoire');
      return;
    }

    this.isCreating = true;
    this.managerService.creerRealisation(slug, this.newRealisation, this.newVideoFile).subscribe({
      next: () => {
        this.isCreating = false;
        this.showCreateModal = false;
        this.notificationService.success('La réalisation vidéo a été mise en ligne avec succès.', 'Réalisation créée');
        this.chargerRealisations();
      },
      error: (err) => {
        this.isCreating = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la création de la réalisation.', 'Erreur');
      }
    });
  }


  // --- BASCULER PUBLICATION ---
  basculerPublication(r: Realisation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    const nouveauStatut = !r.statutPublication;
    this.managerService.modifierStatutPublication(slug, r.id, { statutPublication: nouveauStatut }).subscribe({
      next: () => {
        this.notificationService.success(
          nouveauStatut ? 'La réalisation est désormais publique.' : 'La réalisation a été dépubliée.',
          'Statut de publication mis à jour'
        );
        this.chargerRealisations();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Erreur lors de la modification de la publication.', 'Erreur');
      }
    });
  }

  // --- LECTURE VIDÉO ---
  openPlayerModal(r: Realisation): void {
    this.playingRealisation = r;
    this.showPlayerModal = true;
  }

  closePlayerModal(): void {
    this.showPlayerModal = false;
    this.playingRealisation = null;
  }

  // --- SUPPRESSION RÉALISATION ---
  openDeleteModal(r: Realisation): void {
    this.realisationToDelete = r;
    this.showDeleteModal = true;
  }

  confirmerSuppression(): void {
    const slug = this.slugSalon;
    if (!slug || !this.realisationToDelete) return;

    this.isDeleting = true;
    this.managerService.supprimerRealisation(slug, this.realisationToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.notificationService.success('La réalisation et son média Cloudinary ont été supprimés.', 'Suppression confirmée');
        this.chargerRealisations();
      },
      error: (err) => {
        this.isDeleting = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la suppression.', 'Erreur');
      }
    });
  }

  // --- MODÉRATION DES COMMENTAIRES ---
  masquerCommentaire(c: CommentaireRealisation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.managerService.masquerCommentaire(slug, c.id).subscribe({
      next: () => {
        this.notificationService.warning('Le commentaire a été masqué du flux public.', 'Commentaire masqué');
        this.chargerCommentaires();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Erreur lors du masquage.', 'Erreur');
      }
    });
  }

  demasquerCommentaire(c: CommentaireRealisation): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.managerService.demasquerCommentaire(slug, c.id).subscribe({
      next: () => {
        this.notificationService.success('Le commentaire est de nouveau visible.', 'Commentaire réactivé');
        this.chargerCommentaires();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Erreur lors de la réactivation.', 'Erreur');
      }
    });
  }

  openDeleteCommentModal(c: CommentaireRealisation): void {
    this.commentToDelete = c;
    this.showDeleteCommentModal = true;
  }

  confirmerSuppressionCommentaire(): void {
    const slug = this.slugSalon;
    if (!slug || !this.commentToDelete) return;

    this.isDeletingComment = true;
    this.managerService.supprimerCommentaire(slug, this.commentToDelete.id).subscribe({
      next: () => {
        this.isDeletingComment = false;
        this.showDeleteCommentModal = false;
        this.notificationService.success('Le commentaire a été définitivement supprimé.', 'Commentaire supprimé');
        this.chargerCommentaires();
      },
      error: (err) => {
        this.isDeletingComment = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la suppression.', 'Erreur');
      }
    });
  }

  getRealisationTitre(realisationId: number): string {
    const r = this.realisations().find((item) => item.id === realisationId);
    return r ? r.titre : `Réalisation #${realisationId}`;
  }
}
