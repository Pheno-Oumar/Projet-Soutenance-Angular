import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ComptableService } from '../../services/comptable.service';
import {
  RapportFinancier,
  RapportFinancierFiltreDto,
  RapportExport,
  TypeRapportFinancier,
  FormatExportDonnees,
  CategorieDepense
} from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-comptable-rapports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './comptable-rapports.component.html',
  styleUrl: './comptable-rapports.component.css'
})
export class ComptableRapportsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly comptableService = inject(ComptableService);

  readonly rapport = signal<RapportFinancier | null>(null);
  readonly exportsList = signal<RapportExport[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly downloadingId = signal<number | null>(null);

  // Active view: 'generator' | 'exports'
  activeTab: 'generator' | 'exports' = 'generator';

  // Filter form
  filterDto: RapportFinancierFiltreDto = {
    typeRapport: 'ENTREES_SORTIES',
    dateDebut: '',
    dateFin: '',
    format: 'PDF'
  };

  selectedFormat: FormatExportDonnees = 'PDF';

  readonly categoriesList: CategorieDepense[] = [
    'LOYER',
    'ELECTRICITE',
    'EAU',
    'INTERNET',
    'SALAIRE',
    'FOURNITURES',
    'ACHAT_STOCK',
    'ENTRETIEN',
    'REMBOURSEMENT',
    'TRANSPORT',
    'AUTRE'
  ];

  ngOnInit(): void {
    // Par défaut : mois en cours
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.filterDto.dateDebut = firstDay.toISOString().split('T')[0];
    this.filterDto.dateFin = now.toISOString().split('T')[0];

    this.consulterRapport();
    this.chargerExports();
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

  consulterRapport(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.comptableService.consulterRapport(slug, this.filterDto).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.rapport.set(res.data);
        } else {
          this.errorMessage.set(res.message || 'Impossible de générer le rapport');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de la génération du rapport');
      }
    });
  }

  exporterRapport(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isExporting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const exportPayload: RapportFinancierFiltreDto = {
      ...this.filterDto,
      format: this.selectedFormat
    };

    this.comptableService.exporterRapport(slug, exportPayload).subscribe({
      next: (res) => {
        this.isExporting.set(false);
        if (res.success && res.data) {
          this.successMessage.set(`Rapport exporté avec succès en format ${res.data.format} ! Téléchargement en cours...`);
          setTimeout(() => this.successMessage.set(null), 5000);
          this.chargerExports();
          // Téléchargement sécurisé direct via le backend
          this.telechargerExport(res.data);
        }
      },
      error: (err) => {
        this.isExporting.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de l’export du document');
      }
    });
  }

  telechargerExport(exp: RapportExport): void {
    const slug = this.slugSalon;
    if (!slug || !exp.exportId) return;

    this.downloadingId.set(exp.exportId);
    this.comptableService.telechargerExport(slug, exp.exportId).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
        const ext = exp.format ? exp.format.toLowerCase() : 'pdf';
        const filename = `rapport_financier_${slug}_${exp.exportId}.${ext}`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingId.set(null);
        // Fallback si disponible
        if (exp.urlTelechargement) {
          window.open(exp.urlTelechargement, '_blank');
        } else {
          this.errorMessage.set('Erreur lors du téléchargement du fichier.');
        }
      }
    });
  }

  chargerExports(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.comptableService.listerMesExports(slug).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.exportsList.set(res.data);
        }
      },
      error: () => {}
    });
  }
}
