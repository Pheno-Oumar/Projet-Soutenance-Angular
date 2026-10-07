import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  KpiFinancier,
  RapportFinancier,
  RapportFinancierFiltreDto,
  TypeRapportFinancier,
  FormatExportDonnees
} from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-rapports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-rapports.component.html',
  styleUrl: './proprietaire-rapports.component.css'
})
export class ProprietaireRapportsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly notificationService = inject(NotificationService);

  readonly kpiFinanciers = signal<KpiFinancier | null>(null);
  readonly rapport = signal<RapportFinancier | null>(null);
  readonly isLoadingKpi = signal<boolean>(false);
  readonly isLoadingRapport = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Filtre
  filtre: RapportFinancierFiltreDto = {
    typeRapport: 'ENTREES_SORTIES',
    dateDebut: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateFin: new Date().toISOString().split('T')[0],
    format: 'PDF'
  };

  ngOnInit(): void {
    this.chargerKpisFinanciers();
    this.genererRapport();
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

  chargerKpisFinanciers(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoadingKpi.set(true);
    this.proprietaireService.getKpiFinanciers(slug).subscribe({
      next: (res) => {
        this.isLoadingKpi.set(false);
        if (res?.data) {
          this.kpiFinanciers.set(res.data);
        }
      },
      error: () => {
        this.isLoadingKpi.set(false);
      }
    });
  }

  genererRapport(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoadingRapport.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.consulterRapport(slug, this.filtre).subscribe({
      next: (res) => {
        this.isLoadingRapport.set(false);
        if (res?.data) {
          this.rapport.set(res.data);
        }
      },
      error: (err) => {
        this.isLoadingRapport.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors de la génération du rapport.');
      }
    });
  }

  exporter(format: FormatExportDonnees): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isExporting.set(true);
    const exportFilter = { ...this.filtre, format };

    this.proprietaireService.exporterRapport(slug, exportFilter).subscribe({
      next: (res) => {
        this.isExporting.set(false);
        if (res?.data?.exportId) {
          this.notificationService.success(`Rapport ${format} généré avec succès. Téléchargement en cours...`, 'Export Réussi');
          this.telechargerExport(res.data.exportId, format, res.data.urlTelechargement);
        } else if (res?.data?.urlTelechargement) {
          this.notificationService.success(`Rapport ${format} généré avec succès. Téléchargement...`, 'Export Réussi');
          window.open(res.data.urlTelechargement, '_blank');
        } else {
          this.notificationService.success(`Rapport ${format} généré.`, 'Export Réussi');
        }
      },
      error: (err) => {
        this.isExporting.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors de l’export.', 'Export Échoué');
      }
    });
  }

  telechargerExport(exportId: number, format: FormatExportDonnees, fallbackUrl?: string): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.proprietaireService.telechargerExport(slug, exportId).subscribe({
      next: (blob) => {
        const ext = format ? format.toLowerCase() : 'pdf';
        const filename = `rapport_financier_${slug}_${exportId}.${ext}`;
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
        if (fallbackUrl) {
          window.open(fallbackUrl, '_blank');
        }
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
