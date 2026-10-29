import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { KadysService } from '../../../../core/services/kadys.service';
import { StoryManagerService } from '../../../../core/services/story-manager.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CommentaireRealisation, KadysRealisation } from '../../../../shared/models';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-comment-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './comment-drawer.component.html',
  styleUrls: ['./comment-drawer.component.css']
})
export class CommentDrawerComponent implements OnInit {
  private readonly kadysService = inject(KadysService);
  private readonly storyManagerService = inject(StoryManagerService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  @Input() realisation!: KadysRealisation;
  @Output() close = new EventEmitter<void>();
  @Output() commentAdded = new EventEmitter<void>();

  readonly commentaires = signal<CommentaireRealisation[]>([]);
  readonly chargement = signal<boolean>(false);
  nouveauCommentaire = '';
  envoiEnCours = false;

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get isManagerInThisSalon(): boolean {
    const context = this.authService.currentSalonContext();
    return !!(
      context &&
      context.slugSalon === this.realisation.salonSlug &&
      context.roles.includes('MANAGER')
    );
  }

  ngOnInit(): void {
    this.chargerCommentaires();
  }

  chargerCommentaires(): void {
    this.chargement.set(true);
    this.kadysService.getCommentaires(this.realisation.id).subscribe({
      next: (list) => {
        this.commentaires.set(list);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
      }
    });
  }

  publierCommentaire(): void {
    if (!this.nouveauCommentaire.trim()) return;
    this.envoiEnCours = true;

    this.kadysService
      .ajouterCommentaire(this.realisation.id, { contenu: this.nouveauCommentaire.trim() })
      .subscribe({
        next: (nouveau) => {
          this.commentaires.update((list) => [nouveau, ...list]);
          this.nouveauCommentaire = '';
          this.envoiEnCours = false;
          this.realisation.totalCommentaires++;
          this.commentAdded.emit();
          this.notificationService.success('Commentaire publié avec succès');
        },
        error: (err) => {
          this.envoiEnCours = false;
          this.notificationService.error(
            err.error?.message || 'Erreur lors de la publication du commentaire'
          );
        }
      });
  }

  supprimerCommentaire(commentId: number): void {
    this.kadysService.supprimerCommentaire(commentId).subscribe({
      next: () => {
        this.commentaires.update((list) => list.filter((c) => c.id !== commentId));
        this.realisation.totalCommentaires = Math.max(0, this.realisation.totalCommentaires - 1);
        this.notificationService.success('Commentaire supprimé');
      },
      error: () => {
        this.notificationService.error('Impossible de supprimer le commentaire');
      }
    });
  }

  masquerCommentaire(commentId: number): void {
    this.storyManagerService
      .masquerCommentaire(this.realisation.salonSlug, commentId)
      .subscribe({
        next: () => {
          this.commentaires.update((list) =>
            list.map((c) => (c.id === commentId ? { ...c, statut: 'MASQUE' } : c))
          );
          this.notificationService.success('Commentaire masqué avec succès');
        },
        error: () => {
          this.notificationService.error('Erreur lors du masquage');
        }
      });
  }
}
