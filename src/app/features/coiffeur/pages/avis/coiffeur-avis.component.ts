import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CoiffeurService } from '../../services/coiffeur.service';
import { AvisPrestation } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-coiffeur-avis',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './coiffeur-avis.component.html',
  styleUrl: './coiffeur-avis.component.css'
})
export class CoiffeurAvisComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly coiffeurService = inject(CoiffeurService);

  readonly avisList = signal<AvisPrestation[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Filter: null (Tous), true (Validés/Publiés), false (En attente)
  selectedStatut: boolean | null = null;

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
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const statutParam = this.selectedStatut === null ? undefined : this.selectedStatut;

    this.coiffeurService.getAvis(slug, statutParam).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.avisList.set(res.data);
        } else {
          this.errorMessage.set(res.message || 'Impossible de charger vos avis');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des avis');
      }
    });
  }

  setStatutFilter(statut: boolean | null): void {
    this.selectedStatut = statut;
    this.chargerAvis();
  }

  get noteMoyenne(): number {
    const list = this.avisList();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, a) => acc + (a.note || 0), 0);
    return Math.round((sum / list.length) * 10) / 10;
  }

  getStarsArray(count: number): number[] {
    return Array(Math.max(0, Math.min(5, count))).fill(0);
  }

  getEmptyStarsArray(count: number): number[] {
    return Array(Math.max(0, 5 - Math.min(5, count))).fill(0);
  }
}
