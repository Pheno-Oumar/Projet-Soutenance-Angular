import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ManagerService } from '../../services/manager.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ClientSalonResume,
  FicheClientManager
} from '../../../../shared/models';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manager-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './manager-clients.component.html',
  styleUrl: './manager-clients.component.css'
})
export class ManagerClientsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly managerService = inject(ManagerService);
  private readonly notificationService = inject(NotificationService);

  readonly clients = signal<ClientSalonResume[]>([]);
  readonly isLoading = signal<boolean>(false);

  readonly searchTerm = signal<string>('');

  // --- MODAL: Fiche Client Sécurisée ---
  readonly showClientDetailModal = signal<boolean>(false);
  readonly isLoadingDetail = signal<boolean>(false);
  readonly selectedClientDetail = signal<FicheClientManager | null>(null);

  readonly filteredClients = computed(() => {
    const list = this.clients();
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return list;
    return list.filter((c) => {
      const nom = (c.nom || '').toLowerCase();
      const prenom = (c.prenom || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const tel = (c.telephone || '').toLowerCase();
      return nom.includes(term) || prenom.includes(term) || email.includes(term) || tel.includes(term);
    });
  });

  ngOnInit(): void {
    this.chargerClients();
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

  chargerClients(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);

    this.managerService.listerClients(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.clients.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement des clients.', 'Erreur');
      }
    });
  }

  ouvrirFicheClient(client: ClientSalonResume): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.showClientDetailModal.set(true);
    this.isLoadingDetail.set(true);
    this.selectedClientDetail.set(null);

    this.managerService.getClientDetail(slug, client.clientId).subscribe({
      next: (res) => {
        this.isLoadingDetail.set(false);
        if (res?.data) {
          this.selectedClientDetail.set(res.data);
        }
      },
      error: (err) => {
        this.isLoadingDetail.set(false);
        this.notificationService.error(err?.error?.message || 'Impossible de charger la fiche client.', 'Erreur');
      }
    });
  }

  fermerFicheClient(): void {
    this.showClientDetailModal.set(false);
    this.selectedClientDetail.set(null);
  }
}
