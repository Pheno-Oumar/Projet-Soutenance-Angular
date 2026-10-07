import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { PlanningRendezVousDto, Employe } from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-planning.component.html',
  styleUrl: './proprietaire-planning.component.css'
})
export class ProprietairePlanningComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);

  readonly planning = signal<PlanningRendezVousDto[]>([]);
  readonly coiffeurs = signal<Employe[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  selectedDate: string = new Date().toISOString().split('T')[0];
  selectedCoiffeurId: number | null = null;

  ngOnInit(): void {
    this.chargerCoiffeurs();
    this.chargerPlanning();
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

  chargerCoiffeurs(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.proprietaireService.listerEmployes(slug).subscribe({
      next: (res) => {
        if (res?.data) {
          this.coiffeurs.set(res.data.filter(e => e.roles && e.roles.includes('COIFFEUR')));
        }
      },
      error: () => {}
    });
  }

  chargerPlanning(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const coiffeurId = this.selectedCoiffeurId ? Number(this.selectedCoiffeurId) : undefined;

    this.proprietaireService.getPlanning(slug, this.selectedDate, coiffeurId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.planning.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors de la récupération du planning.');
      }
    });
  }

  changerJour(delta: number): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + delta);
    this.selectedDate = d.toISOString().split('T')[0];
    this.chargerPlanning();
  }

  allerAujourdhui(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.chargerPlanning();
  }

  calculerTotalEstime(): number {
    return this.planning().reduce((acc, curr) => acc + (Number(curr.montantEstime) || 0), 0);
  }

  formatDevise(val: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
