import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SalonCartStore } from '../../state/salon-cart.store';
import { SalonContextStore } from '../../state/salon-context.store';
import { LignePanier } from '../../../../shared/models';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.css']
})
export class CartDrawerComponent {
  readonly cartStore = inject(SalonCartStore);
  readonly contextStore = inject(SalonContextStore);
  private readonly router = inject(Router);

  readonly isOpen = computed(() => this.cartStore.isDrawerOpen());
  readonly panier = this.cartStore.panier;
  readonly nombreArticles = this.cartStore.nombreArticles;
  readonly montantTotal = this.cartStore.montantTotal;
  readonly chargement = this.cartStore.chargement;

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  get salonNom(): string {
    return this.contextStore.salon()?.nom || 'Le Salon';
  }

  close(): void {
    this.cartStore.closeDrawer();
  }

  incrementQuantite(item: LignePanier): void {
    this.cartStore.modifierQuantite(this.slugSalon, item.produitId, item.quantite + 1);
  }

  decrementQuantite(item: LignePanier): void {
    if (item.quantite > 1) {
      this.cartStore.modifierQuantite(this.slugSalon, item.produitId, item.quantite - 1);
    } else {
      this.removeItem(item.produitId);
    }
  }

  removeItem(produitId: number): void {
    this.cartStore.supprimerArticle(this.slugSalon, produitId);
  }

  clearPanier(): void {
    this.cartStore.viderPanier(this.slugSalon);
  }

  goToBoutique(): void {
    this.close();
    this.router.navigate(['/' + this.slugSalon + '/boutique']);
  }

  proceedToCheckout(): void {
    this.close();
    this.router.navigate(['/' + this.slugSalon + '/panier']);
  }
}
