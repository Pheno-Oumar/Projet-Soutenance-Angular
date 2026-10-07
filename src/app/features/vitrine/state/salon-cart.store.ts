import { Injectable, inject, signal, computed } from '@angular/core';
import { PanierService } from '../../../core/services/panier.service';
import { Produit } from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class SalonCartStore {
  private readonly panierService = inject(PanierService);

  readonly isDrawerOpen = signal<boolean>(false);

  // Exposition réactive directe depuis PanierService
  readonly panier = this.panierService.panier;
  readonly nombreArticles = this.panierService.nombreArticles;
  readonly montantTotal = this.panierService.montantTotal;
  readonly chargement = this.panierService.chargement;

  readonly hasItems = computed(() => (this.nombreArticles() || 0) > 0);

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((v) => !v);
  }

  init(slugSalon: string): void {
    this.panierService.chargerPanier(slugSalon);
  }

  ajouterProduit(
    slugSalon: string,
    produit: { id: number; nom: string; prixVente: number; imageUrl?: string; quantiteDisponible?: number },
    quantite = 1
  ): void {
    this.panierService.ajouterArticle(slugSalon, produit, quantite);
  }

  modifierQuantite(slugSalon: string, produitId: number, quantite: number): void {
    this.panierService.modifierQuantite(slugSalon, produitId, quantite);
  }

  supprimerArticle(slugSalon: string, produitId: number): void {
    this.panierService.supprimerArticle(slugSalon, produitId);
  }

  viderPanier(slugSalon: string): void {
    this.panierService.viderPanier(slugSalon);
  }
}
