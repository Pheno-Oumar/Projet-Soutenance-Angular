import { Component, OnInit, inject, signal } from '@angular/core';
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

  searchTerm = '';

  // --- MODAL: Fiche Client Sécurisée ---
  showClientDetailModal = false;
  isLoadingDetail = false;
  selectedClientDetail: FicheClientManager | null = null;

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

  get filteredClients(): ClientSalonResume[] {
    const list = this.clients();
    if (!this.searchTerm.trim()) return list;
    const term = this.searchTerm.toLowerCase();
    return list.filter(
      (c) =>
        c.nom.toLowerCase().includes(term) ||
        c.prenom.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (c.telephone && c.telephone.toLowerCase().includes(term))
    );
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

    this.showClientDetailModal = true;
    this.isLoadingDetail = true;
    this.selectedClientDetail = null;

    this.managerService.getClientDetail(slug, client.clientId).subscribe({
      next: (res) => {
        this.isLoadingDetail = false;
        if (res?.data) {
          this.selectedClientDetail = res.data;
        }
      },
      error: (err) => {
        this.isLoadingDetail = false;
        this.notificationService.error(err?.error?.message || 'Impossible de charger la fiche client.', 'Erreur');
      }
    });
  }

  fermerFicheClient(): void {
    this.showClientDetailModal = false;
    this.selectedClientDetail = null;
  }
}
