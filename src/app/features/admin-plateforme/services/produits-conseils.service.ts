import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  ProduitConseil,
  ProduitConseilDto,
  ProduitConseilStats,
  EtapeRoutine
} from '../../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ProduitsConseilsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin-systeme/produits-conseils`;

  lister(filtres?: {
    actif?: boolean;
    etapeRoutine?: EtapeRoutine | string;
    recherche?: string;
  }): Observable<ApiResponse<ProduitConseil[]>> {
    let params = new HttpParams();
    if (filtres?.actif !== undefined && filtres.actif !== null) {
      params = params.set('actif', filtres.actif.toString());
    }
    if (filtres?.etapeRoutine) {
      params = params.set('etapeRoutine', filtres.etapeRoutine);
    }
    if (filtres?.recherche && filtres.recherche.trim()) {
      params = params.set('recherche', filtres.recherche.trim());
    }
    return this.http.get<ApiResponse<ProduitConseil[]>>(this.baseUrl, { params });
  }

  getStatistiques(): Observable<ApiResponse<ProduitConseilStats>> {
    return this.http.get<ApiResponse<ProduitConseilStats>>(`${this.baseUrl}/statistiques`);
  }

  getById(id: number): Observable<ApiResponse<ProduitConseil>> {
    return this.http.get<ApiResponse<ProduitConseil>>(`${this.baseUrl}/${id}`);
  }

  creer(dto: ProduitConseilDto): Observable<ApiResponse<ProduitConseil>> {
    return this.http.post<ApiResponse<ProduitConseil>>(this.baseUrl, dto);
  }

  modifier(id: number, dto: ProduitConseilDto): Observable<ApiResponse<ProduitConseil>> {
    return this.http.put<ApiResponse<ProduitConseil>>(`${this.baseUrl}/${id}`, dto);
  }

  basculerStatut(id: number): Observable<ApiResponse<ProduitConseil>> {
    return this.http.patch<ApiResponse<ProduitConseil>>(`${this.baseUrl}/${id}/statut`, {});
  }

  supprimer(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  uploadImage(id: number, file: File): Observable<ApiResponse<ProduitConseil>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<ProduitConseil>>(`${this.baseUrl}/${id}/image`, formData);
  }
}
