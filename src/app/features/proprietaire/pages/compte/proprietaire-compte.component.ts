import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Compte, CompteUpdateDto, ChangementMotDePasseDto, TransfertProprieteDto } from '../../../../shared/models';

export interface OperationalRoleOption {
  key: string;
  label: string;
  description: string;
  badgeClass: string;
}

const AVAILABLE_OPERATIONAL_ROLES: OperationalRoleOption[] = [
  { key: 'COIFFEUR', label: 'Coiffeur / Styliste', description: 'Recevez des réservations clients, gérez votre planning et effectuez des prestations.', badgeClass: 'role-coiffeur' },
  { key: 'MANAGER', label: 'Manager de Salon', description: 'Supervisez l’équipe, validez les plannings et gérez les opérations quotidiennes.', badgeClass: 'role-manager' },
  { key: 'RECEPTIONNISTE', label: 'Réceptionniste / Caisse', description: 'Accueil des clients au salon, gestion de la file d’attente et encaissement.', badgeClass: 'role-reception' },
  { key: 'COMPTABLE', label: 'Comptable', description: 'Gestion de la facturation, clôtures de caisse et rapports financiers.', badgeClass: 'role-comptable' },
  { key: 'RESPONSABLE_STOCK', label: 'Responsable Stock', description: 'Gestion des stocks de produits, alertes de réapprovisionnement et commandes.', badgeClass: 'role-stock' }
];

@Component({
  selector: 'app-proprietaire-compte',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-compte.component.html',
  styleUrl: './proprietaire-compte.component.css'
})
export class ProprietaireCompteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly compte = signal<Compte | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSavingProfil = signal<boolean>(false);
  readonly isSavingMdp = signal<boolean>(false);
  readonly isSavingRoles = signal<boolean>(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Rôles du propriétaire
  readonly mesRoles = signal<string[]>(['PROPRIETAIRE', 'CLIENT']);
  readonly availableOperationalRoles = AVAILABLE_OPERATIONAL_ROLES;

  // Form Profil
  profilForm: CompteUpdateDto = {
    nom: '',
    prenom: '',
    dateNaissance: '',
    telephone: ''
  };

  // Form Mot de Passe
  mdpForm = {
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmationMotDePasse: ''
  };

  // Cession / Transfert de Propriété
  readonly showTransferModal = signal<boolean>(false);
  readonly isTransferring = signal<boolean>(false);
  readonly transferError = signal<string | null>(null);
  transferForm: TransfertProprieteDto = {
    nouvelEmailProprietaire: '',
    motDePasseConfirmation: ''
  };

  ngOnInit(): void {
    this.chargerProfil();
    this.chargerMesRoles();
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

  chargerProfil(): void {
    const slug = this.slugSalon;
    if (!slug) {
      this.errorMessage.set('Identifiant du salon introuvable.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.getProfil(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          const c = res.data;
          this.compte.set(c);
          this.profilForm = {
            nom: c.nom || '',
            prenom: c.prenom || '',
            dateNaissance: c.dateNaissance ? c.dateNaissance.split('T')[0] : '',
            telephone: c.telephone || ''
          };
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement du profil.');
      }
    });
  }

  chargerMesRoles(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.proprietaireService.getMesRoles(slug).subscribe({
      next: (res) => {
        if (res?.data?.roles) {
          this.mesRoles.set(res.data.roles);
        }
      },
      error: () => {
        const storedRoles = this.authService.currentRoles();
        if (storedRoles && storedRoles.length > 0) {
          this.mesRoles.set(storedRoles);
        }
      }
    });
  }

  isRoleActive(roleKey: string): boolean {
    return this.mesRoles().includes(roleKey);
  }

  toggleOperationalRole(roleKey: string): void {
    if (roleKey === 'PROPRIETAIRE') {
      this.notificationService.error(
        'Le rôle Propriétaire est permanent et ne peut jamais être retiré sauf transfert de propriété.',
        'Rôle Protégé'
      );
      return;
    }
    if (roleKey === 'CLIENT') {
      this.notificationService.error(
        'Le rôle Client est automatique pour tous les membres du salon.',
        'Information'
      );
      return;
    }

    const current = [...this.mesRoles()];
    const idx = current.indexOf(roleKey);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(roleKey);
    }
    this.mesRoles.set(current);
  }

  enregistrerMesRoles(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isSavingRoles.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.proprietaireService.updateMesRoles(slug, this.mesRoles()).subscribe({
      next: (res) => {
        this.isSavingRoles.set(false);
        const roles = res?.data?.roles || this.mesRoles();
        this.mesRoles.set(roles);

        // Mettre à jour le contexte auth pour refléter immédiatement les rôles dans la navigation
        const currentContext = this.authService.currentSalonContext();
        if (currentContext) {
          this.authService.setSalonContext(
            slug,
            roles,
            currentContext.nomSalon,
            currentContext.actif,
            currentContext.logoUrl
          );
        }

        const msg = 'Vos rôles ont été mis à jour avec succès. Vos espaces de travail sont actualisés.';
        this.successMessage.set(msg);
        this.notificationService.success('Rôles mis à jour', msg);
      },
      error: (err) => {
        this.isSavingRoles.set(false);
        const errStr = err?.error?.message || 'Erreur lors de la mise à jour de vos rôles.';
        this.errorMessage.set(errStr);
        this.notificationService.error('Erreur', errStr);
      }
    });
  }

  enregistrerProfil(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.profilForm.nom.trim() || !this.profilForm.prenom.trim()) {
      this.errorMessage.set('Le nom et le prénom sont obligatoires.');
      return;
    }

    this.isSavingProfil.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.proprietaireService.updateProfil(slug, this.profilForm).subscribe({
      next: (res) => {
        this.isSavingProfil.set(false);
        const msg = 'Vos informations personnelles ont été mises à jour avec succès.';
        this.successMessage.set(msg);
        this.notificationService.success('Profil mis à jour', msg);
        if (res?.data) {
          this.compte.set(res.data);
        }
      },
      error: (err) => {
        this.isSavingProfil.set(false);
        const errStr = err?.error?.message || 'Erreur lors de la mise à jour du profil.';
        this.errorMessage.set(errStr);
        this.notificationService.error('Erreur', errStr);
      }
    });
  }

  changerMotDePasse(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.mdpForm.ancienMotDePasse) {
      this.errorMessage.set('Veuillez renseigner votre mot de passe actuel.');
      return;
    }

    if (!this.mdpForm.nouveauMotDePasse || this.mdpForm.nouveauMotDePasse.length < 8) {
      this.errorMessage.set('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (this.mdpForm.nouveauMotDePasse !== this.mdpForm.confirmationMotDePasse) {
      this.errorMessage.set('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    this.isSavingMdp.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const dto: ChangementMotDePasseDto = {
      ancienMotDePasse: this.mdpForm.ancienMotDePasse,
      nouveauMotDePasse: this.mdpForm.nouveauMotDePasse
    };

    this.proprietaireService.changerMotDePasse(slug, dto).subscribe({
      next: () => {
        this.isSavingMdp.set(false);
        const msg = 'Votre mot de passe a été modifié avec succès.';
        this.successMessage.set(msg);
        this.notificationService.success('Sécurité', msg);
        this.mdpForm = {
          ancienMotDePasse: '',
          nouveauMotDePasse: '',
          confirmationMotDePasse: ''
        };
      },
      error: (err) => {
        this.isSavingMdp.set(false);
        const errStr = err?.error?.message || 'Erreur lors du changement de mot de passe.';
        this.errorMessage.set(errStr);
        this.notificationService.error('Erreur', errStr);
      }
    });
  }

  openTransferModal(): void {
    this.transferForm = {
      nouvelEmailProprietaire: '',
      motDePasseConfirmation: ''
    };
    this.transferError.set(null);
    this.showTransferModal.set(true);
  }

  closeTransferModal(): void {
    this.showTransferModal.set(false);
    this.isTransferring.set(false);
    this.transferError.set(null);
  }

  executerTransfert(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.transferForm.nouvelEmailProprietaire.trim() || !this.transferForm.motDePasseConfirmation) {
      this.transferError.set('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    this.isTransferring.set(true);
    this.transferError.set(null);

    this.proprietaireService.transfererPropriete(slug, this.transferForm).subscribe({
      next: () => {
        this.isTransferring.set(false);
        this.closeTransferModal();
        this.notificationService.success(
          'La propriété du salon a été transférée avec succès. Votre session a été clôturée.',
          'Cession effectuée'
        );
        this.authService.logout().subscribe({
          next: () => this.router.navigate(['/auth/login']),
          error: () => this.router.navigate(['/auth/login'])
        });
      },
      error: (err) => {
        this.isTransferring.set(false);
        this.transferError.set(err?.error?.message || 'Erreur lors du transfert de propriété.');
      }
    });
  }
}
