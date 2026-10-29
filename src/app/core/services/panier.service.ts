import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError, forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
import { NotificationService } from './notification.service';
import { ApiResponse, Panier, LignePanier, AjoutPanierDto, ModificationQuantiteDto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class PanierService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly baseUrl = environment.apiUrl;

  private readonly currentSalonSlug = signal<string | null>(null);
  readonly panier = signal<Panier | null>(null);
  readonly chargement = signal<boolean>(false);

  readonly nombreArticles = computed(() => {
    const p = this.panier();
    if (!p || !p.lignes) return 0;
    return p.lignes.reduce((acc, ligne) => acc + ligne.quantite, 0);
  });

  readonly montantTotal = computed(() => {
    const p = this.panier();
    if (!p) return 0;
    return p.montantTotal || 0;
  });

  private getStorageKey(slugSalon: string): string {
    return `hair_style_cart_${slugSalon}`;
  }

  /**
   * Initialise ou recharge le panier pour un salon donné.
   * Si l'utilisateur est connecté et qu'il y a un panier local, synchronise automatiquement !
   */
  chargerPanier(slugSalon: string): void {
    this.currentSalonSlug.set(slugSalon);
    const estConnecte = this.authService.isAuthenticated();

    if (estConnecte) {
      // Vérifier s'il y a des articles locaux à synchroniser d'abord
      const panierLocal = this.recupererPanierLocal(slugSalon);
      if (panierLocal && panierLocal.lignes && panierLocal.lignes.length > 0) {
        this.synchroniserPanierVersBackend(slugSalon, panierLocal.lignes).subscribe(() => {
          this.rafraichirPanierBackend(slugSalon);
        });
      } else {
        this.rafraichirPanierBackend(slugSalon);
      }
    } else {
      // Charger depuis localStorage
      const local = this.recupererPanierLocal(slugSalon);
      this.panier.set(local);
    }
  }

  /**
   * Ajoute un article au panier (local ou distant).
   */
  ajouterArticle(slugSalon: string, produit: { id: number; nom: string; prixVente: number; imageUrl?: string; quantiteDisponible?: number }, quantite: number = 1): void {
    const estConnecte = this.authService.isAuthenticated();

    if (estConnecte) {
      const dto: AjoutPanierDto = { produitId: produit.id, quantite };
      this.http.post<ApiResponse<Panier>>(`${this.baseUrl}/${slugSalon}/client/panier/articles`, dto)
        .pipe(
          tap(res => {
            if (res.data) {
              this.panier.set(res.data);
              this.notificationService.success(`${produit.nom} ajouté au panier !`);
            }
          }),
          catchError(err => {
            this.notificationService.error(err.error?.message || 'Erreur lors de l’ajout au panier');
            return of(null);
          })
        ).subscribe();
    } else {
      // Mode Hors-Ligne / Visiteur anonyme
      const local = this.recupererPanierLocal(slugSalon) || {
        id: 0,
        slugSalon,
        clientEmail: 'visiteur@local',
        lignes: [],
        montantTotal: 0,
        nombreArticles: 0
      };

      const ligneExistante = local.lignes.find(l => l.produitId === produit.id);
      if (ligneExistante) {
        ligneExistante.quantite += quantite;
        ligneExistante.sousTotal = ligneExistante.quantite * ligneExistante.prixUnitaire;
      } else {
        const nouvelleLigne: LignePanier = {
          id: Date.now(),
          produitId: produit.id,
          produitNom: produit.nom,
          prixUnitaire: produit.prixVente,
          quantite,
          sousTotal: quantite * produit.prixVente,
          stockDisponible: produit.quantiteDisponible || 99,
          enAlerte: false
        };
        local.lignes.push(nouvelleLigne);
      }

      this.recalculerEtSauvegarderLocal(slugSalon, local);
      this.notificationService.success(`${produit.nom} ajouté au panier !`);
    }
  }

  /**
   * Modifie la quantité d'un produit.
   */
  modifierQuantite(slugSalon: string, produitId: number, quantite: number): void {
    if (quantite <= 0) {
      this.supprimerArticle(slugSalon, produitId);
      return;
    }

    const estConnecte = this.authService.isAuthenticated();

    if (estConnecte) {
      const dto: ModificationQuantiteDto = { quantite };
      this.http.put<ApiResponse<Panier>>(`${this.baseUrl}/${slugSalon}/client/panier/articles/${produitId}`, dto)
        .pipe(
          tap(res => {
            if (res.data) this.panier.set(res.data);
          }),
          catchError(err => {
            this.notificationService.error(err.error?.message || 'Erreur lors de la modification');
            return of(null);
          })
        ).subscribe();
    } else {
      const local = this.recupererPanierLocal(slugSalon);
      if (!local) return;

      const ligne = local.lignes.find(l => l.produitId === produitId);
      if (ligne) {
        ligne.quantite = quantite;
        ligne.sousTotal = ligne.quantite * ligne.prixUnitaire;
        this.recalculerEtSauvegarderLocal(slugSalon, local);
      }
    }
  }

  /**
   * Supprime un article du panier.
   */
  supprimerArticle(slugSalon: string, produitId: number): void {
    const estConnecte = this.authService.isAuthenticated();

    if (estConnecte) {
      this.http.delete<ApiResponse<Panier>>(`${this.baseUrl}/${slugSalon}/client/panier/articles/${produitId}`)
        .pipe(
          tap(res => {
            if (res.data) this.panier.set(res.data);
          }),
          catchError(err => {
            this.notificationService.error(err.error?.message || 'Erreur lors de la suppression');
            return of(null);
          })
        ).subscribe();
    } else {
      const local = this.recupererPanierLocal(slugSalon);
      if (!local) return;

      local.lignes = local.lignes.filter(l => l.produitId !== produitId);
      this.recalculerEtSauvegarderLocal(slugSalon, local);
    }
  }

  /**
   * Vide entièrement le panier.
   */
  viderPanier(slugSalon: string): void {
    const estConnecte = this.authService.isAuthenticated();

    if (estConnecte) {
      this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${slugSalon}/client/panier`)
        .pipe(
          tap(() => {
            this.panier.set({
              id: 0,
              slugSalon,
              clientEmail: '',
              lignes: [],
              montantTotal: 0,
              nombreArticles: 0
            });
          })
        ).subscribe();
    } else {
      localStorage.removeItem(this.getStorageKey(slugSalon));
      this.panier.set(null);
    }
  }

  // --- LOGIQUE INTERNE & SYNCHRONISATION LOCALSTORAGE -> BACKEND ---

  private recupererPanierLocal(slugSalon: string): Panier | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.getStorageKey(slugSalon));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Panier;
    } catch {
      return null;
    }
  }

  private recalculerEtSauvegarderLocal(slugSalon: string, panier: Panier): void {
    panier.montantTotal = panier.lignes.reduce((sum, l) => sum + l.sousTotal, 0);
    panier.nombreArticles = panier.lignes.reduce((sum, l) => sum + l.quantite, 0);

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getStorageKey(slugSalon), JSON.stringify(panier));
    }
    this.panier.set({ ...panier });
  }

  private rafraichirPanierBackend(slugSalon: string): void {
    this.chargement.set(true);
    this.http.get<ApiResponse<Panier>>(`${this.baseUrl}/${slugSalon}/client/panier`)
      .pipe(
        tap(res => {
          this.panier.set(res.data || null);
          this.chargement.set(false);
        }),
        catchError(() => {
          this.chargement.set(false);
          return of(null);
        })
      ).subscribe();
  }

  private synchroniserPanierVersBackend(slugSalon: string, lignesLocales: LignePanier[]): Observable<any> {
    const requests = lignesLocales.map(ligne =>
      this.http.post<ApiResponse<Panier>>(`${this.baseUrl}/${slugSalon}/client/panier/articles`, {
        produitId: ligne.produitId,
        quantite: ligne.quantite
      }).pipe(catchError(() => of(null)))
    );

    return forkJoin(requests).pipe(
      tap(() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(this.getStorageKey(slugSalon));
        }
        this.notificationService.info('Votre panier local a été synchronisé avec votre compte !');
      })
    );
  }
}
