import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminSystemService } from '../../services/admin-system.service';
import { KpiPlateforme } from '../../../../shared/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminSystemService);

  readonly kpis = signal<KpiPlateforme | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly activityCanvas = viewChild<ElementRef<HTMLCanvasElement>>('activityCanvas');
  readonly doughnutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('doughnutCanvas');

  private activityChart?: Chart;
  private doughnutChart?: Chart;

  constructor() {
    afterNextRender(() => {
      this.initOrUpdateCharts();
    });
  }

  ngOnInit(): void {
    this.chargerKpis();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  chargerKpis(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getKpiPlateforme().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.data) {
          this.kpis.set(res.data);
          this.initOrUpdateCharts();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des statistiques de la plateforme.');
      }
    });
  }

  formatDevise(val: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }

  private destroyCharts(): void {
    if (this.activityChart) {
      this.activityChart.destroy();
      this.activityChart = undefined;
    }
    if (this.doughnutChart) {
      this.doughnutChart.destroy();
      this.doughnutChart = undefined;
    }
  }

  private initOrUpdateCharts(): void {
    const kpi = this.kpis();
    const actCanvas = this.activityCanvas()?.nativeElement;
    const dghCanvas = this.doughnutCanvas()?.nativeElement;

    if (!actCanvas || !dghCanvas) {
      return;
    }

    this.destroyCharts();

    // Chart 1 : Bar Chart Activité (RDV vs Prestations)
    const totalRdv = kpi?.nombreRendezVousTotal ?? 0;
    const totalPrestations = kpi?.nombrePrestationsTotal ?? 0;
    const termineesPrestations = kpi?.nombrePrestationsTerminees ?? 0;

    this.activityChart = new Chart(actCanvas, {
      type: 'bar',
      data: {
        labels: ['Rendez-vous Total', 'Prestations Réalisées', 'Prestations Créées'],
        datasets: [
          {
            label: 'Volume',
            data: [totalRdv, termineesPrestations, totalPrestations],
            backgroundColor: [
              'rgba(212, 175, 55, 0.8)',   // Laiton Doré
              'rgba(74, 59, 50, 0.85)',    // Marron Chocolat
              'rgba(158, 142, 132, 0.65)'  // Teinte secondaire
            ],
            borderColor: [
              '#D4AF37',
              '#4A3B32',
              '#7A695F'
            ],
            borderWidth: 1.5,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#4A3B32',
            titleColor: '#D4AF37',
            bodyColor: '#FFFFFF',
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#7A695F'
            },
            grid: {
              color: 'rgba(74, 59, 50, 0.08)'
            }
          },
          x: {
            ticks: {
              color: '#4A3B32',
              font: { weight: 'bold' }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });

    // Chart 2 : Doughnut Chart Répartition Salons & Comptes
    const salonsActifs = kpi?.nombreSalonsActifs ?? 0;
    const salonsInactifs = kpi?.nombreSalonsInactifs ?? 0;
    const comptesActifs = kpi?.nombreComptesActifs ?? 0;
    const comptesInactifs = kpi?.nombreComptesInactifs ?? 0;

    this.doughnutChart = new Chart(dghCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Salons Actifs', 'Salons Inactifs', 'Comptes Actifs', 'Comptes Suspendus'],
        datasets: [
          {
            data: [
              salonsActifs || (salonsInactifs ? 0 : 1),
              salonsInactifs,
              comptesActifs,
              comptesInactifs
            ],
            backgroundColor: [
              '#D4AF37',                   // Or - Salons Actifs
              'rgba(212, 175, 55, 0.25)',  // Or léger - Salons Inactifs
              '#4A3B32',                   // Chocolat - Comptes Actifs
              '#EF4444'                    // Rouge discret - Comptes Suspendus
            ],
            borderWidth: 2,
            borderColor: '#FFFFFF',
            hoverOffset: 6
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
              color: '#4A3B32',
              font: {
                family: 'Plus Jakarta Sans',
                size: 11
              },
              boxWidth: 12,
              padding: 12
            }
          },
          tooltip: {
            backgroundColor: '#4A3B32',
            titleColor: '#D4AF37',
            bodyColor: '#FFFFFF',
            padding: 10,
            cornerRadius: 8
          }
        },
        cutout: '65%'
      }
    });
  }
}
