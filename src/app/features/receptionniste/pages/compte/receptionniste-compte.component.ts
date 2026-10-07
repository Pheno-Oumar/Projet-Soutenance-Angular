import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReceptionnisteService } from '../../services/receptionniste.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Compte, CompteUpdateDto, ChangementMotDePasseDto } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-receptionniste-compte',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './receptionniste-compte.component.html',
  styleUrl: './receptionniste-compte.component.css'
})
export class ReceptionnisteCompteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly receptionnisteService = inject(ReceptionnisteService);
  private readonly notificationService = inject(NotificationService);

  readonly compte = signal<Compte | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSavingProfil = signal<boolean>(false);
  readonly isChangingPassword = signal<boolean>(false);

  readonly infoMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordMessage = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);

  updateDto: CompteUpdateDto = {
    nom: '',
    prenom: '',
    telephone: '',
    dateNaissance: ''
  };

  passwordDto: ChangementMotDePasseDto = {
    ancienMotDePasse: '',
    nouveauMotDePasse: ''
  };
  confirmationMotDePasse = '';

  ngOnInit(): void {
    this.chargerCompte();
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

  chargerCompte(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.receptionnisteService.getCompte(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.compte.set(res.data);
          this.updateDto = {
            nom: res.data.nom || '',
            prenom: res.data.prenom || '',
            telephone: res.data.telephone || '',
            dateNaissance: res.data.dateNaissance || ''
          };
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Erreur lors du chargement de votre compte';
        this.errorMessage.set(msg);
        this.notificationService.error(msg, 'Compte');
      }
    });
  }

  mettreAJourProfil(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isSavingProfil.set(true);
    this.infoMessage.set(null);
    this.errorMessage.set(null);

    this.receptionnisteService.updateCompte(slug, this.updateDto).subscribe({
      next: (res) => {
        this.isSavingProfil.set(false);
        if (res.data) {
          this.compte.set(res.data);
        }
        const msg = 'Profil réceptionniste mis à jour avec succès.';
        this.infoMessage.set(msg);
        this.notificationService.success(msg, 'Profil Mis à Jour');
        setTimeout(() => this.infoMessage.set(null), 5000);
      },
      error: (err) => {
        this.isSavingProfil.set(false);
        const errMsg = err.error?.message || 'Erreur lors de la mise à jour du profil';
        this.errorMessage.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }

  changerMotDePasse(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (this.passwordDto.nouveauMotDePasse !== this.confirmationMotDePasse) {
      const msg = 'Les deux nouveaux mots de passe ne correspondent pas.';
      this.passwordError.set(msg);
      this.notificationService.warning(msg, 'Mot de passe');
      return;
    }

    if (this.passwordDto.nouveauMotDePasse.length < 6) {
      const msg = 'Le mot de passe doit comporter au moins 6 caractères.';
      this.passwordError.set(msg);
      this.notificationService.warning(msg, 'Mot de passe');
      return;
    }

    this.isChangingPassword.set(true);
    this.passwordMessage.set(null);
    this.passwordError.set(null);

    this.receptionnisteService.changerMotDePasse(slug, this.passwordDto).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        const msg = 'Mot de passe changé avec succès.';
        this.passwordMessage.set(msg);
        this.notificationService.success(msg, 'Sécurité');
        this.passwordDto = { ancienMotDePasse: '', nouveauMotDePasse: '' };
        this.confirmationMotDePasse = '';
        setTimeout(() => this.passwordMessage.set(null), 5000);
      },
      error: (err) => {
        this.isChangingPassword.set(false);
        const errMsg = err.error?.message || 'Erreur lors du changement de mot de passe';
        this.passwordError.set(errMsg);
        this.notificationService.error(errMsg, 'Erreur');
      }
    });
  }
}
