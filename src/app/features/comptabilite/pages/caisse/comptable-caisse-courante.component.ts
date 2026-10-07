import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ComptableService } from '../../services/comptable.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SessionCaisse, OperationCaisse, OuvertureCaisseDto, FermetureCaisseDto } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-comptable-caisse-courante',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  templateUrl: './comptable-caisse-courante.component.html',
  styleUrl: './comptable-caisse-courante.component.css'
})
export class ComptableCaisseCouranteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly comptableService = inject(ComptableService);
  private readonly notificationService = inject(NotificationService);

  readonly session = signal<SessionCaisse | null>(null);
  readonly operations = signal<OperationCaisse[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Modal Ouverture
  showOpenModal = false;
  openSolde: number = 0;
  isOpenSubmitting = false;
  openError: string | null = null;

  // Modal Clôture
  showCloseModal = false;
  closeSolde: number = 0;
  isCloseSubmitting = false;
  closeError: string | null = null;

  ngOnInit(): void {
    this.chargerSession();
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

  chargerSession(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.comptableService.getSessionCourante(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.session.set(res.data);
          this.chargerOperations(res.data.id);
        } else {
          this.session.set(null);
          this.operations.set([]);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.session.set(null);
        this.operations.set([]);
      }
    });
  }

  chargerOperations(sessionId: number): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.comptableService.getOperationsSession(slug, sessionId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.operations.set(res.data);
        }
      },
      error: () => {}
    });
  }

  // --- ACTIONS OUVERTURE ---
  ouvrirModalOuverture(): void {
    this.openSolde = 0;
    this.openError = null;
    this.showOpenModal = true;
  }

  fermerModalOuverture(): void {
    this.showOpenModal = false;
  }

  confirmerOuverture(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (this.openSolde < 0) {
      this.openError = 'Le fond de caisse initial ne peut pas être négatif.';
      return;
    }

    this.isOpenSubmitting = true;
    this.openError = null;

    const dto: OuvertureCaisseDto = { soldeOuverture: this.openSolde };

    this.comptableService.ouvrirSession(slug, dto).subscribe({
      next: (res) => {
        this.isOpenSubmitting = false;
        if (res.success) {
          this.showOpenModal = false;
          this.successMessage.set('Session de caisse ouverte avec succès !');
          this.notificationService.success('Session de caisse ouverte avec succès !');
          setTimeout(() => this.successMessage.set(null), 4000);
          this.chargerSession();
        } else {
          const errMsg = res.message || 'Erreur lors de l’ouverture de la session';
          this.openError = errMsg;
          this.notificationService.error(errMsg);
        }
      },
      error: (err) => {
        this.isOpenSubmitting = false;
        const errMsg = err.error?.message || 'Erreur lors de l’ouverture de la session';
        this.openError = errMsg;
        this.notificationService.error(errMsg);
      }
    });
  }

  // --- ACTIONS CLÔTURE ---
  ouvrirModalCloture(): void {
    const s = this.session();
    this.closeSolde = s?.soldeTheorique || 0;
    this.closeError = null;
    this.showCloseModal = true;
  }

  fermerModalCloture(): void {
    this.showCloseModal = false;
  }

  get ecartCloture(): number {
    const s = this.session();
    const theorique = s?.soldeTheorique || 0;
    return this.closeSolde - theorique;
  }

  confirmerCloture(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (this.closeSolde < 0) {
      this.closeError = 'Le solde réel compté ne peut pas être négatif.';
      return;
    }

    this.isCloseSubmitting = true;
    this.closeError = null;

    const dto: FermetureCaisseDto = { soldeFermeture: this.closeSolde };

    this.comptableService.cloturerSession(slug, dto).subscribe({
      next: (res) => {
        this.isCloseSubmitting = false;
        if (res.success) {
          this.showCloseModal = false;
          this.successMessage.set('Session de caisse clôturée avec succès !');
          this.notificationService.success('Session de caisse clôturée avec succès !');
          setTimeout(() => this.successMessage.set(null), 4000);
          this.chargerSession();
        } else {
          const errMsg = res.message || 'Erreur lors de la clôture';
          this.closeError = errMsg;
          this.notificationService.error(errMsg);
        }
      },
      error: (err) => {
        this.isCloseSubmitting = false;
        const errMsg = err.error?.message || 'Erreur lors de la clôture de la session';
        this.closeError = errMsg;
        this.notificationService.error(errMsg);
      }
    });
  }
}
