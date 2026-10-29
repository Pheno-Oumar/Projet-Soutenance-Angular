import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { Paiement } from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-paiements.component.html',
  styleUrl: './proprietaire-paiements.component.css'
})
export class ProprietairePaiementsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);

  readonly paiements = signal<Paiement[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  searchTerm = '';
  selectedMode = '';

  ngOnInit(): void {
    this.chargerPaiements();
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

  chargerPaiements(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.getRevenus(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.paiements.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des paiements.');
      }
    });
  }

  get filteredPaiements(): Paiement[] {
    let list = this.paiements();
    if (this.selectedMode) {
      list = list.filter(p => p.type === this.selectedMode);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.numeroPaiement && p.numeroPaiement.toLowerCase().includes(term)) ||
        (p.factureId && p.factureId.toString().includes(term))
      );
    }
    return list;
  }

  calculerTotal(): number {
    return this.filteredPaiements.reduce((acc, p) => acc + (p.montant || 0), 0);
  }

  formatDevise(val: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
