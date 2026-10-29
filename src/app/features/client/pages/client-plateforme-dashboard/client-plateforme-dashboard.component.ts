import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClientPlateformeService } from '../../../../core/services/client-plateforme.service';
import { KadysService } from '../../../../core/services/kadys.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import { GuestStorageService } from '../../../../core/services/guest-storage.service';
import {
  Compte,
  CompteUpdateDto,
  ProfilCapillaire,
  RendezVous,
  Commande,
  FavoriSalon,
  FavoriCoiffeur,
  KadysRealisation,
  Reclamation
} from '../../../../shared/models';

import { PublicNavbarComponent } from '../../../../core/layout/public-navbar/public-navbar.component';
import { HlsVideoDirective } from '../../../../shared/directives/hls-video.directive';
import { MatIconModule } from '@angular/material/icon';

export type PlateformeTab =
  | 'PROFIL_CAPILLAIRE'
  | 'RENDEZ_VOUS'
  | 'COMMANDES'
  | 'FAVORIS'
  | 'INSPIRATIONS'
  | 'COMPTE'
  | 'RGPD';

@Component({
  selector: 'app-client-plateforme-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PublicNavbarComponent, HlsVideoDirective, MatIconModule],
  templateUrl: './client-plateforme-dashboard.component.html',
  styleUrls: ['./client-plateforme-dashboard.component.css']
})
export class ClientPlateformeDashboardComponent implements OnInit {
  private readonly clientService = inject(ClientPlateformeService);
  private readonly kadysService = inject(KadysService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly guestStorage = inject(GuestStorageService);

  readonly salonsRecents = computed(() => this.guestStorage.recentSalons());

  readonly activeTab = signal<PlateformeTab>('PROFIL_CAPILLAIRE');
  readonly compte = signal<Compte | null>(null);
  readonly profilCapillaire = signal<ProfilCapillaire | null>(null);
  readonly rendezVous = signal<RendezVous[]>([]);
  readonly commandes = signal<Commande[]>([]);
  readonly salonsFavoris = signal<FavoriSalon[]>([]);
  readonly coiffeursFavoris = signal<FavoriCoiffeur[]>([]);
  readonly inspirations = signal<KadysRealisation[]>([]);
  readonly reclamations = signal<Reclamation[]>([]);
  readonly chargement = signal<boolean>(true);

  // Form states
  profilForm = {
    typeCheveux: '',
    texture: '',
    porosite: '',
    longueur: '',
    densite: '',
    cuirChevelu: '',
    etatCheveux: ''
  };
  pinCode = '';
  savingProfil = false;
  savingPin = false;

  // Compte form
  compteForm = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    dateNaissance: ''
  };
  savingCompte = false;

  // Password change
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  confirmMotDePasse = '';
  savingPassword = false;

  // Complaint form
  reclamationSalonSlug = '';
  reclamationObjet = '';
  reclamationDesc = '';
  submittingReclamation = false;

  get userName(): string {
    const u = this.authService.currentUser();
    return u ? `${u.prenom} ${u.nom}` : 'Cher client';
  }

  ngOnInit(): void {
    this.chargerDonneesGlobales();
  }

  chargerDonneesGlobales(): void {
    this.chargement.set(true);

    this.clientService.getCompte().subscribe({
      next: (c) => {
        this.compte.set(c);
        if (c) {
          this.compteForm = {
            prenom: c.prenom || '',
            nom: c.nom || '',
            email: c.email || '',
            telephone: c.telephone || '',
            dateNaissance: c.dateNaissance ? c.dateNaissance.split('T')[0] : ''
          };
        }
      },
      error: () => { }
    });

    this.clientService.getProfilCapillaire().subscribe({
      next: (p) => {
        this.profilCapillaire.set(p);
        if (p) {
          this.profilForm = {
            typeCheveux: p.typeCheveux || '',
            texture: p.texture || '',
            porosite: p.porosite || '',
            longueur: p.longueur || '',
            densite: p.densite || '',
            cuirChevelu: p.cuirChevelu || '',
            etatCheveux: p.etatCheveux || ''
          };
        }
      },
      error: () => { }
    });

    this.clientService.listerMesRendezVous().subscribe({
      next: (list) => {
        this.rendezVous.set(list);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false)
    });

    this.clientService.listerMesCommandes().subscribe({
      next: (list) => this.commandes.set(list),
      error: () => { }
    });

    this.clientService.listerMesSalonsFavoris().subscribe({
      next: (list) => this.salonsFavoris.set(list),
      error: () => { }
    });

    this.clientService.listerMesCoiffeursFavoris().subscribe({
      next: (list) => this.coiffeursFavoris.set(list),
      error: () => { }
    });

    this.kadysService.getInspirations().subscribe({
      next: (page) => this.inspirations.set(page.content),
      error: () => { }
    });

    this.clientService.listerMesReclamations().subscribe({
      next: (list) => this.reclamations.set(list),
      error: () => { }
    });
  }

  // Profil Capillaire
  enregistrerProfilCapillaire(): void {
    this.savingProfil = true;
    this.clientService.updateProfilCapillaire(this.profilForm).subscribe({
      next: (updated) => {
        this.profilCapillaire.set(updated);
        this.savingProfil = false;
        this.notificationService.success('Profil capillaire enregistré avec succès');
      },
      error: (err) => {
        this.savingProfil = false;
        this.notificationService.error(
          err.error?.message || 'Erreur lors de la mise à jour du profil capillaire'
        );
      }
    });
  }

  definirCodePin(): void {
    if (!this.pinCode || this.pinCode.length < 4) {
      this.notificationService.warning('Le code PIN secret doit comporter au moins 4 chiffres');
      return;
    }

    this.savingPin = true;
    this.clientService.changerCodeProfil(this.pinCode).subscribe({
      next: () => {
        this.savingPin = false;
        this.pinCode = '';
        if (this.profilCapillaire()) {
          this.profilCapillaire.update((p) => (p ? { ...p, hasCodeProfil: true } : null));
        }
        this.notificationService.success('Code PIN secret mis à jour');
      },
      error: () => {
        this.savingPin = false;
        this.notificationService.error('Erreur lors de la mise à jour du code PIN');
      }
    });
  }

  // Compte Personnel
  enregistrerCompte(): void {
    if (!this.compteForm.prenom?.trim() || !this.compteForm.nom?.trim() || !this.compteForm.telephone?.trim()) {
      this.notificationService.warning('Le prénom, le nom et le numéro de téléphone sont obligatoires.');
      return;
    }

    this.savingCompte = true;
    const payload: CompteUpdateDto = {
      prenom: this.compteForm.prenom.trim(),
      nom: this.compteForm.nom.trim(),
      email: this.compteForm.email?.trim() || undefined,
      telephone: this.compteForm.telephone.trim(),
      dateNaissance: this.compteForm.dateNaissance?.trim() || undefined
    };

    this.clientService.updateCompte(payload).subscribe({
      next: (updated) => {
        this.savingCompte = false;
        this.compte.set(updated);
        this.compteForm = {
          prenom: updated.prenom || '',
          nom: updated.nom || '',
          email: updated.email || '',
          telephone: updated.telephone || '',
          dateNaissance: updated.dateNaissance ? updated.dateNaissance.split('T')[0] : ''
        };
        this.notificationService.success('Vos informations personnelles ont été mises à jour avec succès.', 'Compte Actualisé');
      },
      error: (err) => {
        this.savingCompte = false;
        this.notificationService.error(err.error?.message || 'Erreur lors de la mise à jour des coordonnées.', 'Erreur');
      }
    });
  }

  // Password
  changerMotDePasse(): void {
    if (this.nouveauMotDePasse !== this.confirmMotDePasse) {
      this.notificationService.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (this.nouveauMotDePasse.length < 6) {
      this.notificationService.warning('Le mot de passe doit comporter au moins 6 caractères');
      return;
    }

    this.savingPassword = true;
    this.clientService
      .changerMotDePasse(this.ancienMotDePasse, this.nouveauMotDePasse)
      .subscribe({
        next: () => {
          this.savingPassword = false;
          this.ancienMotDePasse = '';
          this.nouveauMotDePasse = '';
          this.confirmMotDePasse = '';
          this.notificationService.success('Mot de passe changé avec succès');
        },
        error: (err) => {
          this.savingPassword = false;
          this.notificationService.error(
            err.error?.message || 'Erreur lors du changement de mot de passe'
          );
        }
      });
  }

  // Reclamation
  soumettreReclamation(): void {
    if (!this.reclamationSalonSlug || !this.reclamationObjet.trim() || !this.reclamationDesc.trim()) {
      this.notificationService.warning('Veuillez remplir tous les champs de la réclamation');
      return;
    }

    this.submittingReclamation = true;
    this.clientService
      .deposerReclamation(this.reclamationSalonSlug, {
        objet: this.reclamationObjet.trim(),
        description: this.reclamationDesc.trim()
      })
      .subscribe({
        next: (rec) => {
          this.reclamations.update((list) => [rec, ...list]);
          this.submittingReclamation = false;
          this.reclamationObjet = '';
          this.reclamationDesc = '';
          this.notificationService.success('Réclamation transmise avec succès au salon');
        },
        error: (err) => {
          this.submittingReclamation = false;
          this.notificationService.error(
            err.error?.message || 'Erreur lors du dépôt de réclamation'
          );
        }
      });
  }

  // RGPD
  demanderExportDonnees(): void {
    this.clientService.demanderExportDonnees({ motif: 'Portabilité RGPD' }).subscribe({
      next: () => {
        this.notificationService.success('Demande d’export de données enregistrée avec succès');
      },
      error: () => {
        this.notificationService.error('Impossible de demander l’export pour le moment');
      }
    });
  }

  async demanderSuppressionCompte(): Promise<void> {
    const confirmation = await this.confirmationService.confirm({
      title: 'Suppression du compte (RGPD)',
      message: 'Êtes-vous sûr de vouloir demander la suppression de votre compte et de toutes vos données personnelles ? Cette action entraînera l\'anonymisation définitive de votre profil.',
      type: 'danger',
      confirmText: 'Demander la suppression',
      icon: 'delete_forever'
    });
    if (!confirmation) return;

    this.clientService
      .demanderSuppressionCompte({ motif: 'Demande de droit à l’oubli' })
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Demande de suppression enregistrée. Elle sera traitée conformément au RGPD.'
          );
        },
        error: () => {
          this.notificationService.error('Erreur lors de la demande de suppression');
        }
      });
  }
}
