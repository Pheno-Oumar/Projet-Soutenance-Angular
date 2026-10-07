import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { StockSynthese } from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-stocks',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-stocks.component.html',
  styleUrl: './proprietaire-stocks.component.css'
})
export class ProprietaireStocksComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);

  readonly stocks = signal<StockSynthese[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  searchTerm = '';
  onlyAlerts = false;

  ngOnInit(): void {
    this.chargerStocks();
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

  chargerStocks(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.getStock(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.stocks.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des stocks.');
      }
    });
  }

  get filteredStocks(): StockSynthese[] {
    let list = this.stocks();
    if (this.onlyAlerts) {
      list = list.filter(s => s.alerteStockBas);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(s =>
        (s.produitNom && s.produitNom.toLowerCase().includes(term)) ||
        (s.categorieNom && s.categorieNom.toLowerCase().includes(term))
      );
    }
    return list;
  }

  get totalAlertes(): number {
    return this.stocks().filter(s => s.alerteStockBas).length;
  }

  formatDevise(val: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
