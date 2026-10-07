import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ManagerService } from '../../services/manager.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Story } from '../../../../shared/models';
import { HlsVideoDirective } from '../../../../shared/directives/hls-video.directive';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manager-stories',
  standalone: true,
  imports: [CommonModule, FormsModule, HlsVideoDirective, MatIconModule],
  templateUrl: './manager-stories.component.html',
  styleUrl: './manager-stories.component.css'
})
export class ManagerStoriesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly managerService = inject(ManagerService);
  private readonly notificationService = inject(NotificationService);

  readonly stories = signal<Story[]>([]);
  readonly isLoading = signal<boolean>(false);

  // --- Modal: Publier Story ---
  showCreateModal = false;
  isPublishing = false;
  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;
  isVideo = false;

  // --- Modal: Supprimer Story ---
  showDeleteModal = false;
  isDeleting = false;
  storyToDelete: Story | null = null;

  // --- Modal: Visionner Story ---
  showViewerModal = false;
  viewingStory: Story | null = null;

  ngOnInit(): void {
    this.chargerStories();
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

  chargerStories(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.managerService.listerStories(slug).subscribe({
      next: (list) => {
        this.isLoading.set(false);
        this.stories.set(list || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement des stories.', 'Stories');
      }
    });
  }

  openCreateModal(): void {
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.isVideo = false;
    this.showCreateModal = true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const type = file.type;

      if (!type.startsWith('image/') && !type.startsWith('video/')) {
        this.notificationService.error('Seuls les fichiers photos (JPEG, PNG, WebP) et vidéos (MP4, WebM) sont autorisés.', 'Format non supporté');
        return;
      }

      this.selectedFile = file;
      this.isVideo = type.startsWith('video/');

      // Preview URL
      if (this.filePreviewUrl) {
        URL.revokeObjectURL(this.filePreviewUrl);
      }
      this.filePreviewUrl = URL.createObjectURL(file);
    }
  }

  publierStory(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedFile) return;

    this.isPublishing = true;
    this.managerService.publierStory(slug, this.selectedFile).subscribe({
      next: () => {
        this.isPublishing = false;
        this.showCreateModal = false;
        if (this.filePreviewUrl) {
          URL.revokeObjectURL(this.filePreviewUrl);
          this.filePreviewUrl = null;
        }
        this.selectedFile = null;
        this.notificationService.success('Votre story de 24h a été publiée sur la vitrine et Kady’s !', 'Story en ligne');
        this.chargerStories();
      },
      error: (err) => {
        this.isPublishing = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la publication de la story.', 'Erreur');
      }
    });
  }

  openViewer(story: Story): void {
    this.viewingStory = story;
    this.showViewerModal = true;
  }

  closeViewer(): void {
    this.showViewerModal = false;
    this.viewingStory = null;
  }

  openDeleteModal(story: Story): void {
    this.storyToDelete = story;
    this.showDeleteModal = true;
  }

  confirmerSuppression(): void {
    const slug = this.slugSalon;
    if (!slug || !this.storyToDelete) return;

    this.isDeleting = true;
    this.managerService.supprimerStory(slug, this.storyToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.storyToDelete = null;
        this.notificationService.success('La story a été supprimée de votre vitrine.', 'Story supprimée');
        this.chargerStories();
      },
      error: (err) => {
        this.isDeleting = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la suppression de la story.', 'Erreur');
      }
    });
  }

  getTempsRestant(expirationIso: string): string {
    if (!expirationIso) return 'Expire bientôt';
    const now = new Date().getTime();
    const exp = new Date(expirationIso).getTime();
    const diffMs = exp - now;

    if (diffMs <= 0) return 'Expirée';
    const heures = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (heures > 0) {
      return `${heures}h ${minutes}min restantes`;
    }
    return `${minutes} min restantes`;
  }
}
