import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { AuditLog, AuditFilterDto, TypeActionAudit } from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-audit.component.html',
  styleUrl: './proprietaire-audit.component.css'
})
export class ProprietaireAuditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);

  readonly logs = signal<AuditLog[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly totalPages = computed(() => {
    const total = this.logs().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  readonly paginatedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.logs().slice(start, start + this.pageSize());
  });

  readonly paginationInfo = computed(() => {
    const total = this.logs().length;
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), total);
    return { start, end, total };
  });

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const max = 5;
    let start = Math.max(1, current - Math.floor(max / 2));
    let end = Math.min(total, start + max - 1);
    if (end - start + 1 < max) {
      start = Math.max(1, end - max + 1);
    }
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  });

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  onPageSizeChange(newSize: any): void {
    this.pageSize.set(Number(newSize));
    this.currentPage.set(1);
  }

  // Filter state
  activeTab: 'TOUS' | 'SENSIBLES' = 'TOUS';
  motCle = '';
  filtre: AuditFilterDto = {
    action: undefined,
    entite: '',
    dateDebut: '',
    dateFin: ''
  };

  // Selected Log for detail modal
  selectedLog = signal<AuditLog | null>(null);
  showDetailModal = signal<boolean>(false);

  readonly actionsDisponibles: TypeActionAudit[] = [
    'CONNEXION',
    'DECONNEXION',
    'CREATION',
    'MODIFICATION',
    'DESACTIVATION',
    'REACTIVATION',
    'CHANGEMENT_MDP',
    'SUPPRESSION'
  ];

  ngOnInit(): void {
    this.chargerLogs();
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

  chargerLogs(): void {
    const slug = this.slugSalon;
    if (!slug) {
      this.errorMessage.set('Identifiant du salon introuvable.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.activeTab === 'SENSIBLES') {
      this.proprietaireService.listerActionsSensibles(slug).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.logs.set(res?.data || []);
          this.currentPage.set(1);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des actions sensibles.');
        }
      });
    } else if (this.motCle.trim().length > 0) {
      this.proprietaireService.rechercherLogs(slug, this.motCle.trim()).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.logs.set(res?.data || []);
          this.currentPage.set(1);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.message || 'Erreur lors de la recherche.');
        }
      });
    } else {
      const f: AuditFilterDto = {};
      if (this.filtre.action) f.action = this.filtre.action;
      if (this.filtre.entite?.trim()) f.entite = this.filtre.entite.trim();
      if (this.filtre.dateDebut) f.dateDebut = this.filtre.dateDebut;
      if (this.filtre.dateFin) f.dateFin = this.filtre.dateFin;

      this.proprietaireService.listerLogs(slug, f).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.logs.set(res?.data || []);
          this.currentPage.set(1);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement de l’audit.');
        }
      });
    }
  }

  setTab(tab: 'TOUS' | 'SENSIBLES'): void {
    this.activeTab = tab;
    this.motCle = '';
    this.chargerLogs();
  }

  rechercher(): void {
    this.activeTab = 'TOUS';
    this.chargerLogs();
  }

  reinitialiserFiltres(): void {
    this.motCle = '';
    this.filtre = {
      action: undefined,
      entite: '',
      dateDebut: '',
      dateFin: ''
    };
    this.activeTab = 'TOUS';
    this.chargerLogs();
  }

  ouvrirModalDetail(log: AuditLog): void {
    this.selectedLog.set(log);
    this.showDetailModal.set(true);
  }

  fermerModalDetail(): void {
    this.selectedLog.set(null);
    this.showDetailModal.set(false);
  }

  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'CREATION':
        return 'badge-success';
      case 'MODIFICATION':
        return 'badge-info';
      case 'SUPPRESSION':
      case 'DESACTIVATION':
        return 'badge-danger';
      case 'CHANGEMENT_MDP':
      case 'REACTIVATION':
        return 'badge-warning';
      case 'CONNEXION':
      case 'DECONNEXION':
      default:
        return 'badge-neutral';
    }
  }
}
