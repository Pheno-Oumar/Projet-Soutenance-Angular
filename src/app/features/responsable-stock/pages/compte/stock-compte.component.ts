import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ResponsableStockService } from '../../services/responsable-stock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Compte,
  CompteUpdateDto,
  ChangementMotDePasseDto
} from '../../../../shared/models';

@Component({
  selector: 'app-stock-compte',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './stock-compte.component.html',
  styleUrl: './stock-compte.component.css'
})
export class StockCompteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly stockService = inject(ResponsableStockService);
  private readonly notificationService = inject(NotificationService);

  readonly compte = signal<Compte | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Formulaire Coordonnées
  prenom: string = '';
  nom: string = '';
  telephone: string = '';
  dateNaissance: string = '';
  readonly isSubmittingProfile = signal<boolean>(false);

  // Formulaire Mot de Passe
  ancienMotDePasse: string = '';
  nouveauMotDePasse: string = '';
  confirmationMotDePasse: string = '';
  readonly isSubmittingPassword = signal<boolean>(false);

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

    this.stockService.getCompte(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          const c = res.data;
          this.compte.set(c);
          this.prenom = c.prenom || '';
          this.nom = c.nom || '';
          this.telephone = c.telephone || '';
          this.dateNaissance = c.dateNaissance ? c.dateNaissance.split('T')[0] : '';
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement du profil.');
      }
    });
  }

  validerProfil(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.nom.trim() || !this.prenom.trim()) {
      this.notificationService.warning('Le prénom et le nom sont requis.');
      return;
    }

    const payload: CompteUpdateDto = {
      prenom: this.prenom.trim(),
      nom: this.nom.trim(),
      telephone: this.telephone.trim(),
      dateNaissance: this.dateNaissance
    };

    this.isSubmittingProfile.set(true);
    this.stockService.updateCompte(slug, payload).subscribe({
      next: (res) => {
        this.isSubmittingProfile.set(false);
        if (res.success && res.data) {
          this.compte.set(res.data);
          const msg = 'Vos informations personnelles ont été mises à jour.';
          this.successMessage.set(msg);
          this.notificationService.success(msg);
          setTimeout(() => this.successMessage.set(null), 4000);
        }
      },
      error: (err) => {
        this.isSubmittingProfile.set(false);
        const errDesc = err.error?.message || 'Erreur lors de la mise à jour des coordonnées';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  validerMotDePasse(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.ancienMotDePasse || !this.nouveauMotDePasse || !this.confirmationMotDePasse) {
      this.notificationService.warning('Veuillez remplir tous les champs du mot de passe.');
      return;
    }

    if (this.nouveauMotDePasse !== this.confirmationMotDePasse) {
      this.notificationService.warning('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    if (this.nouveauMotDePasse.length < 8) {
      this.notificationService.warning('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    const payload: ChangementMotDePasseDto = {
      ancienMotDePasse: this.ancienMotDePasse,
      nouveauMotDePasse: this.nouveauMotDePasse
    };

    this.isSubmittingPassword.set(true);
    this.stockService.changerMotDePasse(slug, payload).subscribe({
      next: () => {
        this.isSubmittingPassword.set(false);
        this.ancienMotDePasse = '';
        this.nouveauMotDePasse = '';
        this.confirmationMotDePasse = '';
        const msg = 'Votre mot de passe a été modifié avec succès.';
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 5000);
      },
      error: (err) => {
        this.isSubmittingPassword.set(false);
        const errDesc = err.error?.message || 'Erreur lors du changement de mot de passe';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  get initials(): string {
    const p = this.prenom ? this.prenom[0].toUpperCase() : '';
    const n = this.nom ? this.nom[0].toUpperCase() : '';
    return p + n || 'RS';
  }
}
