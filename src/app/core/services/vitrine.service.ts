import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Salon,
  PrestationCatalogue,
  CategorieProduit,
  Produit,
  ProfilCoiffeur,
  CreneauDisponible,
  AvisSalon,
  Realisation,
  Story,
  Compte,
  VitrineDisponibiliteRequest,
  ClientRegisterRequest,
  HoraireOuverture,
  RendezVous,
  VitrineRendezVousCreateDto,
  Commande,
  VitrineCommandeRequest
} from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class VitrineService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Informations publiques et coordonnées du salon
   */
  getInfosSalon(slugSalon: string): Observable<Salon> {
    return this.http
      .get<ApiResponse<Salon>>(`${this.baseUrl}/${slugSalon}/vitrine/infos`)
      .pipe(map((res) => res.data));
  }

  /**
   * Catalogue des prestations et variantes du salon
   */
  getServices(slugSalon: string): Observable<PrestationCatalogue[]> {
    return this.http
      .get<ApiResponse<PrestationCatalogue[]>>(`${this.baseUrl}/${slugSalon}/vitrine/services`)
      .pipe(map((res) => res.data));
  }

  /**
   * Catégories de produits en vente dans le salon
   */
  getCategoriesProduits(slugSalon: string): Observable<CategorieProduit[]> {
    return this.http
      .get<ApiResponse<CategorieProduit[]>>(`${this.baseUrl}/${slugSalon}/vitrine/categories-produits`)
      .pipe(map((res) => res.data));
  }

  /**
   * Produits en vente (avec filtre catégorie optionnel)
   */
  getProduits(slugSalon: string, categorieId?: number): Observable<Produit[]> {
    let params = new HttpParams();
    if (categorieId) {
      params = params.set('categorieId', categorieId.toString());
    }
    return this.http
      .get<ApiResponse<Produit[]>>(`${this.baseUrl}/${slugSalon}/vitrine/produits`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Équipe des coiffeurs du salon et leurs profils publics
   */
  getCoiffeurs(slugSalon: string): Observable<ProfilCoiffeur[]> {
    return this.http
      .get<ApiResponse<ProfilCoiffeur[]>>(`${this.baseUrl}/${slugSalon}/vitrine/coiffeurs`)
      .pipe(map((res) => res.data));
  }

  /**
   * Calcul des créneaux disponibles selon les variantes sélectionnées (sans choix de coiffeur imposé)
   */
  getDisponibilites(
    slugSalon: string,
    request: VitrineDisponibiliteRequest
  ): Observable<CreneauDisponible[]> {
    return this.http
      .post<ApiResponse<CreneauDisponible[]>>(
        `${this.baseUrl}/${slugSalon}/vitrine/disponibilites`,
        request
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Avis clients validés et publiés sur le salon
   */
  getAvis(slugSalon: string): Observable<AvisSalon[]> {
    return this.http
      .get<ApiResponse<AvisSalon[]>>(`${this.baseUrl}/${slugSalon}/vitrine/avis`)
      .pipe(map((res) => res.data));
  }

  /**
   * Galerie des réalisations (photos/vidéos) du salon
   */
  getRealisations(slugSalon: string): Observable<Realisation[]> {
    return this.http
      .get<ApiResponse<Realisation[]>>(`${this.baseUrl}/${slugSalon}/vitrine/realisations`)
      .pipe(map((res) => res.data));
  }

  /**
   * Stories actives (< 24h) du salon
   */
  getStories(slugSalon: string): Observable<Story[]> {
    return this.http
      .get<ApiResponse<Story[]>>(`${this.baseUrl}/${slugSalon}/vitrine/stories`)
      .pipe(map((res) => res.data));
  }

  /**
   * Inscription d'un client dans le salon (crée son compte et l'affecte au salon)
   */
  registerClient(slugSalon: string, request: ClientRegisterRequest): Observable<Compte> {
    return this.http
      .post<ApiResponse<Compte>>(`${this.baseUrl}/${slugSalon}/vitrine/register`, request)
      .pipe(map((res) => res.data));
  }

  /**
   * Réservation en ligne d'un rendez-vous depuis la vitrine (visiteur ou client)
   */
  reserverRendezVous(slugSalon: string, request: VitrineRendezVousCreateDto): Observable<RendezVous> {
    return this.http
      .post<ApiResponse<RendezVous>>(`${this.baseUrl}/${slugSalon}/vitrine/rendez-vous`, request)
      .pipe(map((res) => res.data));
  }

  /**
   * Horaires d'ouverture du salon
   */
  getHoraires(slugSalon: string): Observable<HoraireOuverture[]> {
    return this.http
      .get<ApiResponse<HoraireOuverture[]>>(`${this.baseUrl}/${slugSalon}/vitrine/horaires`)
      .pipe(map((res) => res.data));
  }

  /**
   * Passer une commande Click & Collect de produits depuis la vitrine (visiteur ou client)
   */
  passerCommande(slugSalon: string, request: VitrineCommandeRequest): Observable<Commande> {
    return this.http
      .post<ApiResponse<Commande>>(`${this.baseUrl}/${slugSalon}/vitrine/commandes`, request)
      .pipe(map((res) => res.data));
  }
}
