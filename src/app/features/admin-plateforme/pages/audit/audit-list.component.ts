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
