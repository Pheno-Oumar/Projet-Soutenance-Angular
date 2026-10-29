import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CoiffeurService } from '../../services/coiffeur.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
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
  private readonly confirmationService = inject(ConfirmationService);

  readonly indisponibilites = signal<Indisponibilite[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Modal création
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

  estFutur(dateDebut: string): boolean {
    return new Date(dateDebut) > new Date();
  }
}
