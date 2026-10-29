import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminSystemService } from '../../services/admin-system.service';
import { AuditLog, AuditFilterDto, TypeActionAudit } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule],
  templateUrl: './audit-list.component.html',
  styleUrl: './audit-list.component.css'
})
export class AuditListComponent implements OnInit {
  private readonly adminService = inject(AdminSystemService);

  readonly logs = signal<AuditLog[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly tabMode = signal<'all' | 'sensibles'>('all');
  searchKeyword = '';
  filtreAction = '';

  readonly selectedLog = signal<AuditLog | null>(null);

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

  ngOnInit(): void {
    this.chargerLogs();
  }

  chargerLogs(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.tabMode() === 'sensibles') {
      this.adminService.listerActionsSensibles().subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.logs.set(res.data || []);
          this.currentPage.set(1);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des actions sensibles.');
        }
      });
    } else if (this.searchKeyword.trim()) {
      this.adminService.rechercherLogs(this.searchKeyword.trim()).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.logs.set(res.data || []);
          this.currentPage.set(1);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.message || 'Erreur lors de la recherche.');
        }
      });
    } else {
      const filtre: AuditFilterDto = {};
      if (this.filtreAction) {
        filtre.action = this.filtreAction as TypeActionAudit;
      }

      this.adminService.listerLogs(filtre).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.logs.set(res.data || []);
          this.currentPage.set(1);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des journaux d\'audit.');
        }
      });
    }
  }

  setTabMode(mode: 'all' | 'sensibles'): void {
    this.tabMode.set(mode);
    this.chargerLogs();
  }

  appliquerFiltre(): void {
    this.chargerLogs();
  }

  selectionnerLog(log: AuditLog): void {
    this.selectedLog.set(log);
  }

  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'CONNEXION':
      case 'DECONNEXION':
        return 'badge-connexion';
      case 'CREATION':
        return 'badge-creation';
      case 'MODIFICATION':
        return 'badge-modification';
      case 'DESACTIVATION':
        return 'badge-desactivation';
      case 'REACTIVATION':
        return 'badge-reactivation';
      case 'SUPPRESSION':
      case 'CHANGEMENT_MDP':
        return 'badge-suppression';
      default:
        return 'badge-modification';
    }
  }
}
