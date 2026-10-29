import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ManagerService } from '../../services/manager.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  PlanningRendezVous,
  PrestationCatalogue,
  Realisation,
  AvisPrestation,
  AvisSalon,
  Reclamation,
  ClientSalonResume
} from '../../../../shared/models';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.css'
})
export class ManagerDashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly managerService = inject(ManagerService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly currentUser = this.authService.currentUser;
  readonly salonContext = this.authService.currentSalonContext;

  readonly isLoading = signal<boolean>(true);

  // Data signals
  readonly todayAppointments = signal<PlanningRendezVous[]>([]);
  readonly pendingAvisPrestations = signal<AvisPrestation[]>([]);
  readonly pendingAvisSalon = signal<AvisSalon[]>([]);
  readonly openReclamations = signal<Reclamation[]>([]);
  readonly servicesCount = signal<number>(0);
  readonly realisationsCount = signal<number>(0);
  readonly clientsCount = signal<number>(0);

  readonly currentDate = new Date();

  ngOnInit(): void {
    this.chargerDonneesDashboard();
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

  chargerDonneesDashboard(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);

    const todayStr = new Date().toISOString().split('T')[0];

    // Parallel calls
    this.managerService.getPlanning(slug, todayStr).subscribe({
      next: (res) => {
        if (res?.data) this.todayAppointments.set(res.data);
      },
      error: () => {}
    });

    this.managerService.listerServices(slug, true).subscribe({
      next: (res) => {
        if (res?.data) this.servicesCount.set(res.data.length);
      },
      error: () => {}
    });

    this.managerService.listerRealisations(slug).subscribe({
      next: (res) => {
        if (res?.data) this.realisationsCount.set(res.data.length);
      },
      error: () => {}
    });

    this.managerService.listerClients(slug).subscribe({
      next: (res) => {
        if (res?.data) this.clientsCount.set(res.data.length);
      },
      error: () => {}
    });

    this.managerService.listerAvisPrestations(slug, false).subscribe({
      next: (res) => {
        if (res?.data) this.pendingAvisPrestations.set(res.data);
      },
      error: () => {}
    });

    this.managerService.listerAvisSalon(slug, false).subscribe({
      next: (res) => {
        if (res?.data) this.pendingAvisSalon.set(res.data);
      },
      error: () => {}
    });

    this.managerService.listerReclamations(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          const ouvertes = res.data.filter(r => r.statut === 'EN_ATTENTE' || r.statut === 'EN_COURS');
          this.openReclamations.set(ouvertes);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement des données.', 'Erreur');
      }
    });
  }

  get totalAvisEnAttente(): number {
    return this.pendingAvisPrestations().length + this.pendingAvisSalon().length;
  }

  formatHeure(isoString: string): string {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatDevise(montant?: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(montant || 0);
  }
}
