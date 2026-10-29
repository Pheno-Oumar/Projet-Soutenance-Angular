import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalonContextStore } from '../../state/salon-context.store';
import { SalonCartStore } from '../../state/salon-cart.store';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Tilt3dDirective } from '../../interactions/tilt-3d.directive';
import { RevealOnScrollDirective } from '../../interactions/reveal-on-scroll.directive';
import { MatIconModule } from '@angular/material/icon';

import { VitrineService } from '../../../../core/services/vitrine.service';
import { VitrineCommandeRequest } from '../../../../shared/models';

@Component({
  selector: 'app-cart-checkout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    Tilt3dDirective,
    RevealOnScrollDirective
  ],
  templateUrl: './cart-checkout.component.html',
  styleUrl: './cart-checkout.component.css'
})
export class CartCheckoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly vitrineService = inject(VitrineService);
  readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  readonly contextStore = inject(SalonContextStore);
  readonly cartStore = inject(SalonCartStore);

  readonly submitting = signal<boolean>(false);
  readonly orderConfirmed = signal<boolean>(false);
  readonly orderReference = signal<string>('');

  // Coordonnées client
  nomClient = '';
  telephoneClient = '';
  emailClient = '';
  creerCompte = false;
  motDePasse = '';

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  get salonNom(): string {
    return this.contextStore.salon()?.nom || 'Notre Salon';
  }

  get salonAdresse(): string {
    const s = this.contextStore.salon();
    return s ? `${s.adresse || ''}, ${s.ville || ''}`.trim() : 'Au salon';
  }

  get salonTelephone(): string {
    return this.contextStore.salon()?.telephone || '+223 70 00 00 00';
  }

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const user = this.authService.currentUser();
    if (user) {
      this.nomClient = `${user.prenom || ''} ${user.nom || ''}`.trim();
      this.emailClient = user.email || '';
      this.telephoneClient = user.telephone || '';
    }
  }

  validerCommande(): void {
    if (!this.cartStore.hasItems()) {
      this.notificationService.error('Votre panier est vide.');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      if (!this.nomClient.trim() || !this.telephoneClient.trim()) {
        this.notificationService.error('Veuillez renseigner votre nom et votre numéro de téléphone pour le retrait.');
        return;
      }
      if (this.creerCompte && (!this.motDePasse || this.motDePasse.length < 6)) {
        this.notificationService.error('Le mot de passe pour la création de compte doit comporter au moins 6 caractères.');
        return;
      }
    }

    const p = this.cartStore.panier();
    if (!p || !p.lignes || p.lignes.length === 0) {
      this.notificationService.error('Votre panier est vide.');
      return;
    }

    this.submitting.set(true);

    const payload: VitrineCommandeRequest = {
      nom: this.nomClient.trim() || 'Client',
      telephone: this.telephoneClient.trim(),
      email: this.emailClient.trim() || undefined,
      password: this.creerCompte && this.motDePasse.trim() ? this.motDePasse.trim() : undefined,
      lignes: p.lignes.map((l) => ({
        produitId: l.produitId,
        quantite: l.quantite
      }))
    };

    this.vitrineService.passerCommande(this.slugSalon, payload).subscribe({
      next: (cmd) => {
        this.orderReference.set(cmd.numeroCommande || cmd.codeRetrait || `CMD-${cmd.id}`);
        this.orderConfirmed.set(true);
        this.cartStore.viderPanier(this.slugSalon);
        this.submitting.set(false);
        this.notificationService.success('Commande Click & Collect confirmée avec succès !');
      },
      error: (err) => {
        this.submitting.set(false);
        this.notificationService.error(
          err.error?.message || 'Erreur lors de la validation de votre commande.'
        );
      }
    });
  }

  nouvelleCommande(): void {
    this.orderConfirmed.set(false);
    this.router.navigate(['/' + this.slugSalon + '/boutique']);
  }
}
