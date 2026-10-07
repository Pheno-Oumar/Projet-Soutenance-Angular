import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  CategorieProduit,
  CategorieProduitCreateDto,
  CategorieProduitUpdateDto,
  Produit,
  ProduitCreateDto,
  ProduitUpdateDto,
  MouvementStock,
  MouvementStockCreateDto,
  ProduitAlerteStock,
  Commande,
  StatutCommande,
  RejetCommandeDto,
  RetraitCommandeDto,
  KpiStock,
  Compte,
  CompteUpdateDto,
  ChangementMotDePasseDto
} from '../../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ResponsableStockService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private getUrl(slugSalon: string, path: string): string {
    return `${this.baseUrl}/${slugSalon}/responsable-stock${path}`;
  }

  // --- CATÉGORIES DE PRODUITS ---

  creerCategorie(slugSalon: string, request: CategorieProduitCreateDto, image?: File): Observable<ApiResponse<CategorieProduit>> {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    if (image) {
      formData.append('image', image);
    }
    return this.http.post<ApiResponse<CategorieProduit>>(this.getUrl(slugSalon, '/categories'), formData);
  }

  listerCategories(slugSalon: string, statut?: boolean): Observable<ApiResponse<CategorieProduit[]>> {
    let params = new HttpParams();
    if (statut !== undefined && statut !== null) {
      params = params.set('statut', statut.toString());
    }
    return this.http.get<ApiResponse<CategorieProduit[]>>(this.getUrl(slugSalon, '/categories'), { params });
  }

  obtenirCategorie(slugSalon: string, id: number): Observable<ApiResponse<CategorieProduit>> {
    return this.http.get<ApiResponse<CategorieProduit>>(this.getUrl(slugSalon, `/categories/${id}`));
  }

  modifierCategorie(slugSalon: string, id: number, request: CategorieProduitUpdateDto): Observable<ApiResponse<CategorieProduit>> {
    return this.http.put<ApiResponse<CategorieProduit>>(this.getUrl(slugSalon, `/categories/${id}`), request);
  }

  uploadImageCategorie(slugSalon: string, id: number, file: File): Observable<ApiResponse<CategorieProduit>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch<ApiResponse<CategorieProduit>>(this.getUrl(slugSalon, `/categories/${id}/image`), formData);
  }

  basculerStatutCategorie(slugSalon: string, id: number): Observable<ApiResponse<CategorieProduit>> {
    return this.http.patch<ApiResponse<CategorieProduit>>(this.getUrl(slugSalon, `/categories/${id}/statut`), {});
  }

  // --- PRODUITS ---

  ajouterProduit(slugSalon: string, catId: number, request: ProduitCreateDto, image?: File): Observable<ApiResponse<Produit>> {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    if (image) {
      formData.append('image', image);
    }
    return this.http.post<ApiResponse<Produit>>(this.getUrl(slugSalon, `/categories/${catId}/produits`), formData);
  }

  listerProduits(slugSalon: string, categorieId?: number, statut?: boolean): Observable<ApiResponse<Produit[]>> {
    let params = new HttpParams();
    if (categorieId) {
      params = params.set('categorieId', categorieId.toString());
    }
    if (statut !== undefined && statut !== null) {
      params = params.set('statut', statut.toString());
    }
    return this.http.get<ApiResponse<Produit[]>>(this.getUrl(slugSalon, '/produits'), { params });
  }

  obtenirProduit(slugSalon: string, id: number): Observable<ApiResponse<Produit>> {
    return this.http.get<ApiResponse<Produit>>(this.getUrl(slugSalon, `/produits/${id}`));
  }

  modifierProduit(slugSalon: string, id: number, request: ProduitUpdateDto): Observable<ApiResponse<Produit>> {
    return this.http.put<ApiResponse<Produit>>(this.getUrl(slugSalon, `/produits/${id}`), request);
  }

  uploadImageProduit(slugSalon: string, id: number, file: File): Observable<ApiResponse<Produit>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch<ApiResponse<Produit>>(this.getUrl(slugSalon, `/produits/${id}/image`), formData);
  }

  basculerStatutProduit(slugSalon: string, id: number): Observable<ApiResponse<Produit>> {
    return this.http.patch<ApiResponse<Produit>>(this.getUrl(slugSalon, `/produits/${id}/statut`), {});
  }

  // --- MOUVEMENTS DE STOCK ---

  enregistrerMouvement(slugSalon: string, request: MouvementStockCreateDto): Observable<ApiResponse<MouvementStock>> {
    return this.http.post<ApiResponse<MouvementStock>>(this.getUrl(slugSalon, '/mouvements'), request);
  }

  listerMouvements(slugSalon: string, produitId?: number): Observable<ApiResponse<MouvementStock[]>> {
    let params = new HttpParams();
    if (produitId) {
      params = params.set('produitId', produitId.toString());
    }
    return this.http.get<ApiResponse<MouvementStock[]>>(this.getUrl(slugSalon, '/mouvements'), { params });
  }

  // --- ALERTES DE RUPTURE DE STOCK ---

  getProduitsBientotEnRupture(slugSalon: string): Observable<ApiResponse<ProduitAlerteStock[]>> {
    return this.http.get<ApiResponse<ProduitAlerteStock[]>>(this.getUrl(slugSalon, '/produits/bientot-en-rupture'));
  }

  // --- COMMANDES CLIENTS ---

  listerCommandes(
    slugSalon: string,
    statut?: StatutCommande,
    dateDebut?: string,
    dateFin?: string
  ): Observable<ApiResponse<Commande[]>> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    if (dateDebut) {
      params = params.set('dateDebut', dateDebut);
    }
    if (dateFin) {
      params = params.set('dateFin', dateFin);
    }
    return this.http.get<ApiResponse<Commande[]>>(this.getUrl(slugSalon, '/commandes'), { params });
  }

  obtenirCommande(slugSalon: string, id: number): Observable<ApiResponse<Commande>> {
    return this.http.get<ApiResponse<Commande>>(this.getUrl(slugSalon, `/commandes/${id}`));
  }

  validerCommande(slugSalon: string, id: number): Observable<ApiResponse<Commande>> {
    return this.http.patch<ApiResponse<Commande>>(this.getUrl(slugSalon, `/commandes/${id}/valider`), {});
  }

  rejeterCommande(slugSalon: string, id: number, request: RejetCommandeDto): Observable<ApiResponse<Commande>> {
    return this.http.patch<ApiResponse<Commande>>(this.getUrl(slugSalon, `/commandes/${id}/rejeter`), request);
  }

  confirmerRetrait(slugSalon: string, id: number, request?: RetraitCommandeDto): Observable<ApiResponse<Commande>> {
    return this.http.patch<ApiResponse<Commande>>(this.getUrl(slugSalon, `/commandes/${id}/retrait`), request || {});
  }

  // --- KPI DU STOCK ---

  getKpiStock(slugSalon: string): Observable<ApiResponse<KpiStock>> {
    return this.http.get<ApiResponse<KpiStock>>(this.getUrl(slugSalon, '/kpi'));
  }

  // --- COMPTE PERSONNEL ---

  getCompte(slugSalon: string): Observable<ApiResponse<Compte>> {
    return this.http.get<ApiResponse<Compte>>(this.getUrl(slugSalon, '/compte'));
  }

  updateCompte(slugSalon: string, request: CompteUpdateDto): Observable<ApiResponse<Compte>> {
    return this.http.put<ApiResponse<Compte>>(this.getUrl(slugSalon, '/compte'), request);
  }

  changerMotDePasse(slugSalon: string, request: ChangementMotDePasseDto): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(this.getUrl(slugSalon, '/compte/mot-de-passe'), request);
  }
}
