import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ComptableService } from '../../services/comptable.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { KpiFinancier, SessionCaisse, Depense } from '../../../../shared/models';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-comptable-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './comptable-dashboard.component.html',
  styleUrl: './comptable-dashboard.component.css'
})
export class ComptableDashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly comptableService = inject(ComptableService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly salonContext = this.authService.currentSalonContext;

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  readonly kpi = signal<KpiFinancier | null>(null);
  readonly sessionCourante = signal<SessionCaisse | null>(null);
  readonly recentDepenses = signal<Depense[]>([]);

  ngOnInit(): void {
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

  chargerDonnees(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // KPI Financiers
    this.comptableService.getKpiFinanciers(slug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.kpi.set(res.data);
        }
      },
      error: () => {}
    });

    // Session Caisse Courante
    this.comptableService.getSessionCourante(slug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.sessionCourante.set(res.data);
        } else {
          this.sessionCourante.set(null);
        }
      },
      error: () => {
        this.sessionCourante.set(null);
      }
    });

    // Dernières dépenses
    this.comptableService.listerDepenses(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.recentDepenses.set(res.data.slice(0, 5));
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des données comptables');
      }
    });
  }

  getCategoriesKeys(dict?: Record<string, number>): { key: string; val: number }[] {
    if (!dict) return [];
    return Object.entries(dict).map(([key, val]) => ({ key, val }));
  }
}
