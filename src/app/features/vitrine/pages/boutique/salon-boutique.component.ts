import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { SalonCartStore } from '../../state/salon-cart.store';
import { CategorieProduit, Produit } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { Tilt3dDirective } from '../../interactions/tilt-3d.directive';
import { RevealOnScrollDirective } from '../../interactions/reveal-on-scroll.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-salon-boutique',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    SafeMediaUrlPipe,
    Tilt3dDirective,
    RevealOnScrollDirective
  ],
  templateUrl: './salon-boutique.component.html',
  styleUrl: './salon-boutique.component.css'
})
export class SalonBoutiqueComponent implements OnInit {
  private readonly vitrineService = inject(VitrineService);
  readonly contextStore = inject(SalonContextStore);
  readonly cartStore = inject(SalonCartStore);

  readonly categories = signal<CategorieProduit[]>([]);
  readonly allProduits = signal<Produit[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly searchQuery = signal<string>('');

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  get salonNom(): string {
    return this.contextStore.salon()?.nom || 'Notre Salon';
  }

  async ngOnInit(): Promise<void> {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const slug = this.slugSalon;
    if (slug) {
      try {
        const [cats, prods] = await Promise.all([
          firstValueFrom(this.vitrineService.getCategoriesProduits(slug)),
          firstValueFrom(this.vitrineService.getProduits(slug)).catch(() => [] as Produit[])
        ]);
        this.categories.set(cats || []);
        this.allProduits.set(prods || []);
      } catch {
        this.categories.set([]);
        this.allProduits.set([]);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  readonly filteredCategories = computed<CategorieProduit[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    // Exiger que la catégorie soit active et contienne au moins un produit actif
    let list = this.categories().filter(
      (c) =>
        c.statut &&
        ((c.nombreProduits !== undefined && c.nombreProduits > 0) ||
          (c.produits && c.produits.some((p) => p.statut)))
    );

    if (!q) return list;
    return list.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  });

  openCartDrawer(): void {
    this.cartStore.openDrawer();
  }
}
