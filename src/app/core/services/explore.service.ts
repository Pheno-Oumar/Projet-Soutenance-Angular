import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Salon,
  PrestationCatalogue,
  Produit,
  Realisation,
  AvisSalon,
  CreneauDisponible,
  VitrineDisponibiliteRequest
} from '../../shared/models';
import { PageResponse } from './kadys.service';

@Injectable({
  providedIn: 'root'
})
export class ExploreService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Liste paginée des salons actifs sur la plateforme
   */
  listerSalons(
    page = 0,
    size = 12,
    sortBy = 'nom',
    sortDir = 'asc'
  ): Observable<PageResponse<Salon>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http
      .get<ApiResponse<PageResponse<Salon>>>(`${this.baseUrl}/explore/salons`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Recherche de salons par nom, ville ou description
   */
  rechercherSalons(query: string): Observable<Salon[]> {
    const params = new HttpParams().set('q', query);
    return this.http
      .get<ApiResponse<Salon[]>>(`${this.baseUrl}/explore/salons/search`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Recherche géolocalisée de salons à proximité (Haversine)
   */
  rechercherSalonsProches(lat: number, lng: number, rayonKm = 10): Observable<Salon[]> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString())
      .set('rayonKm', rayonKm.toString());

    return this.http
      .get<ApiResponse<Salon[]>>(`${this.baseUrl}/explore/salons/nearby`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Filtrer les salons proposant un service donné
   */
  filtrerParService(serviceId: number): Observable<Salon[]> {
    const params = new HttpParams().set('serviceId', serviceId.toString());
    return this.http
      .get<ApiResponse<Salon[]>>(`${this.baseUrl}/explore/salons/par-service`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Détails complets d'un salon
   */
  getSalonDetail(slugSalon: string): Observable<Salon> {
    return this.http
      .get<ApiResponse<Salon>>(`${this.baseUrl}/explore/salons/${slugSalon}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Catalogue transversal des produits en vente (tous salons)
   */
  listerProduitsTransversal(categorieId?: number): Observable<Produit[]> {
    let params = new HttpParams();
    if (categorieId) {
      params = params.set('categorieId', categorieId.toString());
    }
    return this.http
      .get<ApiResponse<Produit[]>>(`${this.baseUrl}/explore/produits`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Galerie globale des réalisations publiées (tous salons)
   */
  listerRealisationsTransversal(): Observable<Realisation[]> {
    return this.http
      .get<ApiResponse<Realisation[]>>(`${this.baseUrl}/explore/realisations`)
      .pipe(map((res) => res.data));
  }

  /**
   * Calcul des disponibilités pour un salon
   */
  getDisponibilitesSalon(
    slugSalon: string,
    request: VitrineDisponibiliteRequest
  ): Observable<CreneauDisponible[]> {
    return this.http
      .post<ApiResponse<CreneauDisponible[]>>(
        `${this.baseUrl}/explore/salons/${slugSalon}/disponibilites`,
        request
      )
      .pipe(map((res) => res.data));
  }
}
