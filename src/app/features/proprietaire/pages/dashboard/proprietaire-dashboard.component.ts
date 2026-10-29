import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { KpiSalon, Salon, FermetureExceptionnelle } from '../../../../shared/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-proprietaire-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './proprietaire-dashboard.component.html',
  styleUrl: './proprietaire-dashboard.component.css'
})
export class ProprietaireDashboardComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);

  readonly kpi = signal<KpiSalon | null>(null);
  readonly salon = signal<Salon | null>(null);
  readonly fermetures = signal<FermetureExceptionnelle[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly caChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('caChartCanvas');
  readonly rdvDoughnutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('rdvDoughnutCanvas');

  private caChart?: Chart;
  private rdvChart?: Chart;

  constructor() {
    afterNextRender(() => {
      this.initCharts();
    });
  }

  ngOnInit(): void {
    this.chargerDonnees();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
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

  chargerDonnees(): void {
    const slug = this.slugSalon;
    if (!slug) {
      this.errorMessage.set('Identifiant du salon introuvable dans l’URL.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Charger les infos du salon
    this.proprietaireService.getSalon(slug).subscribe({
      next: (res) => {
        if (res?.data) this.salon.set(res.data);
      },
      error: () => {}
    });

    // Charger les KPIs
    this.proprietaireService.getKpiSalon(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.kpi.set(res.data);
          this.initCharts();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des statistiques du salon.');
      }
    });

    // Charger les fermetures récentes
    this.proprietaireService.listerFermetures(slug).subscribe({
      next: (res) => {
        if (res?.data) {
          this.fermetures.set(res.data.slice(0, 3));
        }
      },
      error: () => {}
    });
  }

  formatDevise(val: number | undefined): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }

  private destroyCharts(): void {
    if (this.caChart) {
      this.caChart.destroy();
      this.caChart = undefined;
    }
    if (this.rdvChart) {
      this.rdvChart.destroy();
      this.rdvChart = undefined;
    }
  }

  private initCharts(): void {
    const kpiData = this.kpi();
    const caCanvas = this.caChartCanvas()?.nativeElement;
    const rdvCanvas = this.rdvDoughnutCanvas()?.nativeElement;

    if (!caCanvas || !rdvCanvas) return;

    this.destroyCharts();

    const caTotal = kpiData?.totalRevenus ?? 0;
    const caMois = kpiData?.beneficeNet ?? (caTotal * 0.4);

    // Graphique 1 : CA Mensuel & Prévisions
    this.caChart = new Chart(caCanvas, {
      type: 'bar',
      data: {
        labels: ['Mois Dernier', 'Ce Mois', 'Objectif'],
        datasets: [
          {
            label: 'Chiffre d’affaires (FCFA)',
            data: [caTotal * 0.35, caMois, caMois * 1.25],
            backgroundColor: ['#5E4B40', '#C8B6A6', '#DED3C7'],
            borderColor: ['#4A3B32', '#B5A292', '#C8B6A6'],
            borderWidth: 1.5,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `${Number(val).toLocaleString('fr-FR')} F`
            },
            grid: {
              color: 'rgba(74, 59, 50, 0.06)'
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

    // Graphique 2 : Rendez-vous & Statuts
    const totalRdv = kpiData?.nombreRendezVousTotal ?? 0;
    const confirmes = totalRdv > 0 ? Math.round(totalRdv * 0.7) : 0;
    const annules = totalRdv > 0 ? Math.round(totalRdv * 0.2) : 0;
    const noShow = totalRdv > 0 ? Math.max(0, totalRdv - confirmes - annules) : 0;

    this.rdvChart = new Chart(rdvCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Honorés / Confirmés', 'Annulés', 'Non présentés'],
        datasets: [
          {
            data: totalRdv > 0 ? [confirmes, annules, noShow] : [1, 0, 0],
            backgroundColor: totalRdv > 0 ? ['#4A3B32', '#C8B6A6', '#1A1A1A'] : ['#EFECE4', '#EFECE4', '#EFECE4'],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 14,
              font: { family: 'Plus Jakarta Sans', size: 12 }
            }
          }
        },
        cutout: '72%'
      }
    });
  }
}
