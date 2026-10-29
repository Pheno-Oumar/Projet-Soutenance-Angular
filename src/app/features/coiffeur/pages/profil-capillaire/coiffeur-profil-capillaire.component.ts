import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CoiffeurService } from '../../services/coiffeur.service';
import { ClientSalonResume, ProfilCapillaire } from '../../../../shared/models';

import { NotificationService } from '../../../../core/services/notification.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-coiffeur-profil-capillaire',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './coiffeur-profil-capillaire.component.html',
  styleUrl: './coiffeur-profil-capillaire.component.css'
})
export class CoiffeurProfilCapillaireComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly coiffeurService = inject(CoiffeurService);
  private readonly notificationService = inject(NotificationService);

  readonly clients = signal<ClientSalonResume[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  searchQuery = '';

  // Modal Saisie PIN Code
  showPinModal = false;
  selectedClient: ClientSalonResume | null = null;
  codePin = '';
  isVerifying = false;
  pinError: string | null = null;

  // Modal Affichage Profil Capillaire Déverrouillé
  showProfileModal = false;
  activeProfilCapillaire: ProfilCapillaire | null = null;

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
    this.errorMessage.set(null);

    this.coiffeurService.getClients(slug, this.searchQuery).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.clients.set(res.data);
        } else {
          this.errorMessage.set(res.message || 'Impossible de récupérer la liste des clients');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des clients');
      }
    });
  }

  onSearchChange(): void {
    this.chargerClients();
  }

  demanderConsultation(client: ClientSalonResume): void {
    this.selectedClient = client;
    this.codePin = '';
    this.pinError = null;
    this.showPinModal = true;
  }

  fermerPinModal(): void {
    this.showPinModal = false;
    this.selectedClient = null;
    this.codePin = '';
    this.pinError = null;
  }

  validerCodePin(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedClient) return;

    if (!this.codePin || this.codePin.trim().length !== 6) {
      this.pinError = 'Le code d’accès doit comporter exactement 6 chiffres.';
      return;
    }

    this.isVerifying = true;
    this.pinError = null;

    this.coiffeurService.consulterProfilCapillaireClient(
      slug,
      this.selectedClient.clientId,
      { codeProfil: this.codePin.trim() }
    ).subscribe({
      next: (res) => {
        this.isVerifying = false;
        if (res.success && res.data) {
          this.activeProfilCapillaire = res.data;
          this.showPinModal = false;
          this.showProfileModal = true;
        } else {
          this.pinError = res.message || 'Code PIN invalide.';
        }
      },
      error: (err) => {
        this.isVerifying = false;
        this.pinError = err.error?.message || 'Code d’accès erroné ou non autorisé.';
      }
    });
  }

  fermerProfileModal(): void {
    this.showProfileModal = false;
    this.activeProfilCapillaire = null;
  }
}
