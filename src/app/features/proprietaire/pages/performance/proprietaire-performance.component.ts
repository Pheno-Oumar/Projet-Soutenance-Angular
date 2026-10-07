import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { PerformanceCoiffeur } from '../../../../shared/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-proprietaire-performance',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './proprietaire-performance.component.html',
  styleUrl: './proprietaire-performance.component.css'
})
export class ProprietairePerformanceComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);

  readonly performances = signal<PerformanceCoiffeur[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private performanceChart?: Chart;

  // Sorting
  critereTri: 'CA' | 'PRESTATIONS' = 'CA';

  constructor() {
    afterNextRender(() => {
      this.initChart();
    });
  }

  ngOnInit(): void {
    this.chargerPerformances();
  }

  ngOnDestroy(): void {
    this.destroyChart();
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

  chargerPerformances(): void {
    const slug = this.slugSalon;
    if (!slug) {
      this.errorMessage.set('Identifiant du salon introuvable.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.getPerformancesCoiffeurs(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const data = res?.data || [];
        this.performances.set(data);
        this.updateChart();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors de la récupération des performances.');
      }
    });
  }

  trierPar(critere: 'CA' | 'PRESTATIONS'): void {
    this.critereTri = critere;
  }

  get listeTriee(): PerformanceCoiffeur[] {
    const list = [...this.performances()];
    if (this.critereTri === 'CA') {
      return list.sort((a, b) => (b.chiffreAffaires || 0) - (a.chiffreAffaires || 0));
    }
    return list.sort((a, b) => (b.nombrePrestations || 0) - (a.nombrePrestations || 0));
  }

  get totalCA(): number {
    return this.performances().reduce((acc, p) => acc + (p.chiffreAffaires || 0), 0);
  }

  get totalPrestations(): number {
    return this.performances().reduce((acc, p) => acc + (p.nombrePrestations || 0), 0);
  }

  get topCoiffeur(): PerformanceCoiffeur | null {
    if (!this.performances().length) return null;
    return [...this.performances()].sort((a, b) => (b.chiffreAffaires || 0) - (a.chiffreAffaires || 0))[0];
  }

  get caMoyen(): number {
    const total = this.performances().length;
    if (total === 0) return 0;
    return Math.round(this.totalCA / total);
  }

  getPourcentageCA(ca: number): number {
    if (!this.totalCA || this.totalCA === 0) return 0;
    return Math.round((ca / this.totalCA) * 100);
  }

  private initChart(): void {
    const canvasRef = this.chartCanvas();
    if (!canvasRef) return;

    const ctx = canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.destroyChart();

    const data = this.listeTriee;
    const labels = data.map((d) => `${d.prenom} ${d.nom}`);
    const caValues = data.map((d) => d.chiffreAffaires || 0);

    this.performanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Chiffre d’affaires (FCFA)',
            data: caValues,
            backgroundColor: 'rgba(74, 59, 50, 0.85)',
            borderColor: '#4A3B32',
            borderWidth: 2,
            borderRadius: 8,
            hoverBackgroundColor: '#C8B6A6'
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
            backgroundColor: '#1A1A1A',
            titleColor: '#FFFFFF',
            bodyColor: '#FAF6F0',
            callbacks: {
              label: (item) => `${this.formatDevise(Number(item.raw))}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#716257', font: { family: 'inherit', weight: 600 } }
          },
          y: {
            grid: { color: 'rgba(200, 182, 166, 0.2)' },
            ticks: {
              color: '#716257',
              callback: (value) => `${Number(value) / 1000}k`
            }
          }
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.performanceChart) {
      this.initChart();
      return;
    }

    const data = this.listeTriee;
    this.performanceChart.data.labels = data.map((d) => `${d.prenom} ${d.nom}`);
    this.performanceChart.data.datasets[0].data = data.map((d) => d.chiffreAffaires || 0);
    this.performanceChart.update();
  }

  private destroyChart(): void {
    if (this.performanceChart) {
      this.performanceChart.destroy();
      this.performanceChart = undefined;
    }
  }

  formatDevise(val: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }
}
