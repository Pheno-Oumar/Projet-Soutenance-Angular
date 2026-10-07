import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { FicheClientComplete } from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-client-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './proprietaire-client-detail.component.html',
  styleUrl: './proprietaire-client-detail.component.css'
})
export class ProprietaireClientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);

  readonly fiche = signal<FicheClientComplete | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  activeTab: 'PROFIL' | 'RDV' | 'PRESTATIONS' | 'FACTURES' = 'PROFIL';

  ngOnInit(): void {
    this.chargerFiche();
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

  chargerFiche(): void {
    const slug = this.slugSalon;
    const clientIdStr = this.route.snapshot.paramMap.get('id');
    if (!slug || !clientIdStr) {
      this.errorMessage.set('Identifiants introuvables.');
      return;
    }

    const clientId = Number(clientIdStr);
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.getFicheClientComplete(slug, clientId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.fiche.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors de la récupération de la fiche client.');
      }
    });
  }

  formatDevise(val: number | undefined): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
