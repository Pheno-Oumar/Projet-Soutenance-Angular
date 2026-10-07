import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminSystemService } from '../../services/admin-system.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Compte, CompteUpdateDto, ChangementMotDePasseDto } from '../../../../shared/models';

@Component({
  selector: 'app-admin-compte',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule],
  templateUrl: './admin-compte.component.html',
  styleUrl: './admin-compte.component.css'
})
export class AdminCompteComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminSystemService);
  private readonly notificationService = inject(NotificationService);

  readonly profil = signal<Compte | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSavingProfil = signal<boolean>(false);
  readonly isChangingMdp = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly profilForm: FormGroup = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    telephone: ['', [Validators.required]],
    dateNaissance: ['', [Validators.required]]
  });

  readonly passwordForm: FormGroup = this.fb.group({
    ancienMotDePasse: ['', [Validators.required]],
    nouveauMotDePasse: ['', [Validators.required, Validators.minLength(6)]],
    confirmation: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.chargerProfil();
  }

  chargerProfil(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getProfil().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.profil.set(res.data);
        if (res.data) {
          this.profilForm.patchValue({
            nom: res.data.nom,
            prenom: res.data.prenom,
            telephone: res.data.telephone,
            dateNaissance: res.data.dateNaissance
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement du profil administrateur.');
      }
    });
  }

  isPasswordMismatch(): boolean {
    const pwd = this.passwordForm.get('nouveauMotDePasse')?.value;
    const conf = this.passwordForm.get('confirmation')?.value;
    return !!(conf && pwd !== conf);
  }

  sauvegarderProfil(): void {
    if (this.profilForm.invalid) return;

    this.isSavingProfil.set(true);
    const dto: CompteUpdateDto = this.profilForm.value;

    this.adminService.updateProfil(dto).subscribe({
      next: (res) => {
        this.isSavingProfil.set(false);
        this.profil.set(res.data);
        this.profilForm.markAsPristine();
        this.notificationService.success(
          'Vos informations de profil ont été mises à jour avec succès.',
          'Profil Mis à Jour'
        );
      },
      error: (err) => {
        this.isSavingProfil.set(false);
        this.notificationService.error(
          err?.error?.message || 'Erreur lors de la mise à jour du profil.',
          'Action Échouée'
        );
      }
    });
  }

  changerMotDePasse(): void {
    if (this.passwordForm.invalid || this.isPasswordMismatch()) return;

    this.isChangingMdp.set(true);
    const dto: ChangementMotDePasseDto = {
      ancienMotDePasse: this.passwordForm.get('ancienMotDePasse')?.value,
      nouveauMotDePasse: this.passwordForm.get('nouveauMotDePasse')?.value
    };

    this.adminService.changerMotDePasse(dto).subscribe({
      next: () => {
        this.isChangingMdp.set(false);
        this.passwordForm.reset();
        this.notificationService.success(
          'Votre mot de passe a été modifié avec succès.',
          'Mot de Passe Modifié'
        );
      },
      error: (err) => {
        this.isChangingMdp.set(false);
        this.notificationService.error(
          err?.error?.message || 'Mot de passe actuel incorrect ou format invalide.',
          'Action Échouée'
        );
      }
    });
  }
}
