import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CoiffeurService } from '../../services/coiffeur.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { CoiffeurDashboard, PlanningRendezVous } from '../../../../shared/models';

import { NotificationService } from '../../../../core/services/notification.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-coiffeur-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule],
  templateUrl: './coiffeur-dashboard.component.html',
  styleUrl: './coiffeur-dashboard.component.css'
})
export class CoiffeurDashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly coiffeurService = inject(CoiffeurService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly currentUser = this.authService.currentUser;
  readonly salonContext = this.authService.currentSalonContext;

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<CoiffeurDashboard | null>(null);

  // Date de filtrage pour le planning
  selectedDate = new Date().toISOString().split('T')[0];
  readonly planningDate = signal<PlanningRendezVous[]>([]);
  readonly isLoadingPlanning = signal<boolean>(false);

  ngOnInit(): void {
    this.chargerDashboard();
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

  chargerDashboard(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.coiffeurService.getDashboard(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.dashboard.set(res.data);
          this.planningDate.set(res.data.planningAujourdhui || []);
        } else {
          this.errorMessage.set(res.message || 'Impossible de charger le tableau de bord');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement du tableau de bord');
      }
    });
  }

  onDateChange(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedDate) return;

    this.isLoadingPlanning.set(true);
    this.coiffeurService.getPlanning(slug, this.selectedDate).subscribe({
      next: (res) => {
        this.isLoadingPlanning.set(false);
        if (res.success && res.data) {
          this.planningDate.set(res.data);
        }
      },
      error: () => {
        this.isLoadingPlanning.set(false);
      }
    });
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut?.toUpperCase()) {
      case 'CONFIRME':
        return 'badge-confirme';
      case 'EN_COURS':
        return 'badge-en-cours';
      case 'TERMINE':
        return 'badge-termine';
      case 'ANNULE':
      case 'NO_SHOW':
        return 'badge-annule';
      default:
        return 'badge-default';
    }
  }
}
