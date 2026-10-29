import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ManagerService } from '../../services/manager.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  AvisPrestation,
  AvisSalon
} from '../../../../shared/models';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manager-avis',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './manager-avis.component.html',
  styleUrl: './manager-avis.component.css'
})
export class ManagerAvisComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly managerService = inject(ManagerService);
  private readonly notificationService = inject(NotificationService);

  activeTab: 'PRESTATIONS' | 'SALON' = 'PRESTATIONS';

  readonly avisPrestations = signal<AvisPrestation[]>([]);
  readonly avisSalon = signal<AvisSalon[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Filter: null = tous, true = validés, false = en attente
  filterStatut: boolean | null = null;

  ngOnInit(): void {
    this.chargerAvis();
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

  chargerAvis(): void {
    if (this.activeTab === 'PRESTATIONS') {
      this.chargerAvisPrestations();
    } else {
      this.chargerAvisSalon();
    }
  }

  chargerAvisPrestations(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);

    const statutParam = this.filterStatut !== null ? this.filterStatut : undefined;
    this.managerService.listerAvisPrestations(slug, statutParam).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.avisPrestations.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement des avis prestations.', 'Erreur');
      }
    });
  }

  chargerAvisSalon(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);

    const statutParam = this.filterStatut !== null ? this.filterStatut : undefined;
    this.managerService.listerAvisSalon(slug, statutParam).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.avisSalon.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement des avis du salon.', 'Erreur');
      }
    });
  }

  modererAvisPrestation(avis: AvisPrestation, nouveauStatut: boolean): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.managerService.modererAvisPrestation(slug, avis.id, nouveauStatut).subscribe({
      next: () => {
        this.notificationService.success(
          nouveauStatut ? 'Avis validé et publié.' : 'Avis rejeté.',
          'Modération enregistrée'
        );
        this.chargerAvisPrestations();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Erreur lors de la modération.', 'Erreur');
      }
    });
  }

  modererAvisSalon(avis: AvisSalon, nouveauStatut: boolean): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.managerService.modererAvisSalon(slug, avis.id, nouveauStatut).subscribe({
      next: () => {
        this.notificationService.success(
          nouveauStatut ? 'Avis salon validé et publié.' : 'Avis salon rejeté.',
          'Modération enregistrée'
        );
        this.chargerAvisSalon();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Erreur lors de la modération.', 'Erreur');
      }
    });
  }

  getEtoilesArray(note: number): number[] {
    return Array(Math.max(1, Math.min(5, Math.round(note)))).fill(0);
  }
}
