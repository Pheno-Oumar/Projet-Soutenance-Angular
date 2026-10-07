import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AvisSalon } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-salon-avis',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './salon-avis.component.html',
  styleUrl: './salon-avis.component.css'
})
export class SalonAvisComponent implements OnInit {
  private readonly vitrineService = inject(VitrineService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  readonly contextStore = inject(SalonContextStore);

  readonly avisList = signal<AvisSalon[]>([]);
  readonly isLoading = signal<boolean>(true);

  readonly noteMoyenne = computed(() => {
    const list = this.avisList();
    if (list.length === 0) return 4.9;
    const sum = list.reduce((acc, a) => acc + a.note, 0);
    return Math.round((sum / list.length) * 10) / 10;
  });

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  async ngOnInit(): Promise<void> {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const slug = this.slugSalon;
    if (slug) {
      try {
        const list = await firstValueFrom(this.vitrineService.getAvis(slug));
        this.avisList.set(list || []);
      } catch (e) {
        this.avisList.set([]);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  deposerAvis(): void {
    if (!this.authService.isAuthenticated()) {
      this.notificationService.info('Veuillez vous connecter pour déposer un avis certifié.');
    } else {
      this.notificationService.info('Formulaire d’avis certifié accessible depuis vos prestations terminées.');
    }
  }
}
