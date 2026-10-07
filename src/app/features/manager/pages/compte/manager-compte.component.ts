import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ManagerService } from '../../services/manager.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Compte,
  CompteUpdateDto,
  ChangementMotDePasseDto
} from '../../../../shared/models';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manager-compte',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './manager-compte.component.html',
  styleUrl: './manager-compte.component.css'
})
export class ManagerCompteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly managerService = inject(ManagerService);
  private readonly notificationService = inject(NotificationService);

  readonly compte = signal<Compte | null>(null);
  readonly isLoading = signal<boolean>(false);

  // Edit profil form
  isUpdatingProfil = false;
  profilData: CompteUpdateDto = {
    nom: '',
    prenom: '',
    telephone: '',
    dateNaissance: ''
  };

  // Password form
  isChangingPassword = false;
  passwordForm = {
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmationMotDePasse: ''
  };

  ngOnInit(): void {
    this.chargerProfil();
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
    if (!slug) return;

    this.isLoading.set(true);

    this.managerService.getProfil(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.compte.set(res.data);
          this.profilData = {
            nom: res.data.nom || '',
            prenom: res.data.prenom || '',
            telephone: res.data.telephone || '',
            dateNaissance: res.data.dateNaissance || ''
          };
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors du chargement du profil.', 'Erreur');
      }
    });
  }

  mettreAJourProfil(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.profilData.nom.trim() || !this.profilData.prenom.trim()) {
      this.notificationService.error('Le nom et le prénom sont obligatoires.', 'Champs requis');
      return;
    }

    this.isUpdatingProfil = true;
    this.managerService.updateProfil(slug, this.profilData).subscribe({
      next: (res) => {
        this.isUpdatingProfil = false;
        if (res?.data) {
          this.compte.set(res.data);
        }
        this.notificationService.success('Vos informations personnelles ont été mises à jour.', 'Profil actualisé');
      },
      error: (err) => {
        this.isUpdatingProfil = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la mise à jour.', 'Erreur');
      }
    });
  }

  changerMotDePasse(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.passwordForm.ancienMotDePasse || !this.passwordForm.nouveauMotDePasse) {
      this.notificationService.error('Veuillez renseigner votre mot de passe actuel et le nouveau.', 'Champs requis');
      return;
    }

    if (this.passwordForm.nouveauMotDePasse !== this.passwordForm.confirmationMotDePasse) {
      this.notificationService.error('Le nouveau mot de passe et sa confirmation ne correspondent pas.', 'Mots de passe différents');
      return;
    }

    this.isChangingPassword = true;
    const req: ChangementMotDePasseDto = {
      ancienMotDePasse: this.passwordForm.ancienMotDePasse,
      nouveauMotDePasse: this.passwordForm.nouveauMotDePasse
    };

    this.managerService.changerMotDePasse(slug, req).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.passwordForm = {
          ancienMotDePasse: '',
          nouveauMotDePasse: '',
          confirmationMotDePasse: ''
        };
        this.notificationService.success('Votre mot de passe a été modifié avec succès.', 'Sécurité');
      },
      error: (err) => {
        this.isChangingPassword = false;
        this.notificationService.error(err?.error?.message || 'Impossible de modifier le mot de passe.', 'Erreur');
      }
    });
  }
}
