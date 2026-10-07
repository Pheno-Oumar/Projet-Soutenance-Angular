import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { Depense, CategorieDepense } from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-depenses',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-depenses.component.html',
  styleUrl: './proprietaire-depenses.component.css'
})
export class ProprietaireDepensesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);

  readonly depenses = signal<Depense[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  searchTerm = '';
  selectedCategorie = '';

  ngOnInit(): void {
    this.chargerDepenses();
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

  chargerDepenses(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.getDepenses(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.depenses.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des dépenses.');
      }
    });
  }

  get filteredDepenses(): Depense[] {
    let list = this.depenses();
    if (this.selectedCategorie) {
      list = list.filter(d => d.categorie === this.selectedCategorie);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(d =>
        (d.description && d.description.toLowerCase().includes(term)) ||
        (d.comptableNomComplet && d.comptableNomComplet.toLowerCase().includes(term))
      );
    }
    return list;
  }

  calculerTotal(): number {
    return this.filteredDepenses.reduce((acc, d) => acc + (d.montant || 0), 0);
  }

  formatDevise(val: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
