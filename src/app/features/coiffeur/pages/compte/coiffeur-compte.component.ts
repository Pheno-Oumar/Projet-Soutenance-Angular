import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CoiffeurService } from '../../services/coiffeur.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Compte, CompteUpdateDto, ChangementMotDePasseDto } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-coiffeur-compte',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './coiffeur-compte.component.html',
  styleUrl: './coiffeur-compte.component.css'
})
export class CoiffeurCompteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly coiffeurService = inject(CoiffeurService);
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

    this.coiffeurService.getCompte(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
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
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des informations de compte');
      }
    });
  }

  sauvegarderProfil(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isSavingProfil.set(true);
    this.infoMessage.set(null);
    this.errorMessage.set(null);

    this.coiffeurService.updateCompte(slug, this.updateDto).subscribe({
      next: (res) => {
        this.isSavingProfil.set(false);
        if (res.success && res.data) {
          this.compte.set(res.data);
          this.infoMessage.set('Vos informations personnelles ont été mises à jour.');
          this.notificationService.success('Vos informations personnelles ont été mises à jour.');
          setTimeout(() => this.infoMessage.set(null), 4000);
        }
      },
      error: (err) => {
        this.isSavingProfil.set(false);
        const errTxt = err.error?.message || 'Erreur lors de la mise à jour';
        this.errorMessage.set(errTxt);
        this.notificationService.error(errTxt);
      }
    });
  }

  changerMotDePasse(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.passwordDto.ancienMotDePasse || !this.passwordDto.nouveauMotDePasse) {
      this.passwordError.set('Veuillez renseigner tous les champs du mot de passe.');
      return;
    }

    if (this.passwordDto.nouveauMotDePasse !== this.confirmationMotDePasse) {
      this.passwordError.set('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    if (this.passwordDto.nouveauMotDePasse.length < 8) {
      this.passwordError.set('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    this.isChangingPassword.set(true);
    this.passwordError.set(null);
    this.passwordMessage.set(null);

    this.coiffeurService.changerMotDePasse(slug, this.passwordDto).subscribe({
      next: (res) => {
        this.isChangingPassword.set(false);
        if (res.success) {
          this.passwordMessage.set('Votre mot de passe a été modifié avec succès.');
          this.notificationService.success('Votre mot de passe a été modifié avec succès.');
          this.passwordDto = { ancienMotDePasse: '', nouveauMotDePasse: '' };
          this.confirmationMotDePasse = '';
          setTimeout(() => this.passwordMessage.set(null), 4000);
        }
      },
      error: (err) => {
        this.isChangingPassword.set(false);
        const errTxt = err.error?.message || 'Erreur lors du changement de mot de passe (vérifiez votre ancien mot de passe)';
        this.passwordError.set(errTxt);
        this.notificationService.error(errTxt);
      }
    });
  }
}
