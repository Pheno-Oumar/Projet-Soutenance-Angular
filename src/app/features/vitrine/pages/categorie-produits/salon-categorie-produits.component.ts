import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { SalonCartStore } from '../../state/salon-cart.store';
import { Produit, CategorieProduit } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { NotificationService } from '../../../../core/services/notification.service';
import { FlyToTargetService } from '../../interactions/fly-to-target.service';
import { Tilt3dDirective } from '../../interactions/tilt-3d.directive';
import { RevealOnScrollDirective } from '../../interactions/reveal-on-scroll.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-salon-categorie-produits',
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
  templateUrl: './salon-categorie-produits.component.html',
  styleUrl: './salon-categorie-produits.component.css'
})
export class SalonCategorieProduitsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly vitrineService = inject(VitrineService);
  private readonly notificationService = inject(NotificationService);
  readonly contextStore = inject(SalonContextStore);
  readonly cartStore = inject(SalonCartStore);
  readonly flyToTargetService = inject(FlyToTargetService);

  readonly produits = signal<Produit[]>([]);
  readonly categorie = signal<CategorieProduit | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly sortOrder = signal<'PERTINENCE' | 'PRIX_ASC' | 'PRIX_DESC'>('PERTINENCE');

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  get salonNom(): string {
    return this.contextStore.salon()?.nom || 'Notre Salon';
  }

  async ngOnInit(): Promise<void> {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const catIdStr = this.route.snapshot.paramMap.get('categorieId');
    const categorieId = catIdStr ? parseInt(catIdStr, 10) : undefined;
    const slug = this.slugSalon;

    if (slug) {
      try {
        const [prods, cats] = await Promise.all([
          firstValueFrom(this.vitrineService.getProduits(slug, categorieId)),
          firstValueFrom(this.vitrineService.getCategoriesProduits(slug)).catch(() => [] as CategorieProduit[])
        ]);

        const activeProds = (prods || []).filter((p) => p.statut);
        this.produits.set(activeProds);
        if (categorieId) {
          const found = cats.find((c) => c.id === categorieId);
          if (found && found.statut && activeProds.length > 0) {
            this.categorie.set(found);
          } else {
            this.categorie.set(null);
          }
        }
      } catch {
        this.produits.set([]);
      } finally {
        this.isLoading.set(false);
      }
    } else {
      this.isLoading.set(false);
    }
  }

  readonly filteredProduits = computed<Produit[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    let list = [...this.produits()];

    if (q) {
      list = list.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    const sort = this.sortOrder();
    if (sort === 'PRIX_ASC') {
      list.sort((a, b) => a.prixVente - b.prixVente);
    } else if (sort === 'PRIX_DESC') {
      list.sort((a, b) => b.prixVente - a.prixVente);
    }

    return list;
  });

  async onAjouterAuPanier(event: MouseEvent, p: Produit): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    const btn = event.currentTarget as HTMLElement;
    this.flyToTargetService.fly(btn, '.dock-btn-cart, .btn-salon-cart', {
      color: '#C8B6A6',
      icon: 'shopping_bag'
    });

    this.cartStore.ajouterProduit(
      this.slugSalon,
      {
        id: p.id,
        nom: p.nom,
        prixVente: p.prixVente,
        imageUrl: p.imageUrl,
        quantiteDisponible: p.stock?.quantiteDisponible
      },
      1
    );

    this.notificationService.success(`${p.nom} ajouté à votre panier Click & Collect !`);
  }

  openCartDrawer(): void {
    this.cartStore.openDrawer();
  }
}
