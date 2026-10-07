import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { SalonCartStore } from '../../state/salon-cart.store';
import { Produit } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { NotificationService } from '../../../../core/services/notification.service';
import { FlyToTargetService } from '../../interactions/fly-to-target.service';
import { Tilt3dDirective } from '../../interactions/tilt-3d.directive';
import { RevealOnScrollDirective } from '../../interactions/reveal-on-scroll.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-salon-produit-detail',
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
  templateUrl: './salon-produit-detail.component.html',
  styleUrl: './salon-produit-detail.component.css'
})
export class SalonProduitDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly vitrineService = inject(VitrineService);
  private readonly notificationService = inject(NotificationService);
  readonly contextStore = inject(SalonContextStore);
  readonly cartStore = inject(SalonCartStore);
  readonly flyToTargetService = inject(FlyToTargetService);

  readonly produit = signal<Produit | null>(null);
  readonly produitsSimilaires = signal<Produit[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly quantite = signal<number>(1);
  readonly activeTab = signal<'description' | 'application' | 'ingredients'>('description');
  readonly isZoomed = signal<boolean>(false);
  readonly zoomTransformOrigin = signal<string>('center center');

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  get salonNom(): string {
    return this.contextStore.salon()?.nom || 'Notre Salon';
  }

  readonly enStock = computed<boolean>(() => {
    const p = this.produit();
    return (p?.stock?.quantiteDisponible ?? 0) > 0;
  });

  readonly quantiteMax = computed<number>(() => {
    return this.produit()?.stock?.quantiteDisponible ?? 99;
  });

  async ngOnInit(): Promise<void> {
    this.route.paramMap.subscribe(async (params) => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const prodIdStr = params.get('produitId');
      const produitId = prodIdStr ? parseInt(prodIdStr, 10) : undefined;
      await this.loadProduit(produitId);
    });
  }

  async loadProduit(produitId?: number): Promise<void> {
    const slug = this.slugSalon;
    if (!slug || !produitId) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.quantite.set(1);

    try {
      const allProduits = await firstValueFrom(this.vitrineService.getProduits(slug));
      const target = allProduits.find((p) => p.id === produitId);

      if (target) {
        this.produit.set(target);
        // Filtrer les produits similaires (même catégorie ou autres soins du salon)
        const similaires = allProduits
          .filter((p) => p.id !== target.id)
          .sort((a, b) => (a.categorieId === target.categorieId ? -1 : 1))
          .slice(0, 4);
        this.produitsSimilaires.set(similaires);
      } else {
        this.produit.set(null);
        this.produitsSimilaires.set([]);
      }
    } catch {
      this.produit.set(null);
      this.produitsSimilaires.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  incrementQuantite(): void {
    if (this.quantite() < this.quantiteMax()) {
      this.quantite.update((q) => q + 1);
    }
  }

  decrementQuantite(): void {
    if (this.quantite() > 1) {
      this.quantite.update((q) => q - 1);
    }
  }

  handleMouseMove(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.zoomTransformOrigin.set(`${x}% ${y}%`);
  }

  ajouterAuPanier(event: MouseEvent): void {
    const p = this.produit();
    if (!p) return;

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
      this.quantite()
    );

    this.notificationService.success(
      `${this.quantite()}x ${p.nom} ajouté${this.quantite() > 1 ? 's' : ''} à votre panier Click & Collect !`
    );
  }

  ajouterProduitSimilaire(event: MouseEvent, p: Produit): void {
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

    this.notificationService.success(`${p.nom} ajouté à votre panier !`);
  }

  openCartDrawer(): void {
    this.cartStore.openDrawer();
  }
}
