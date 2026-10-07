import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  Salon,
  SalonCreateDto,
  Compte,
  CompteUpdateDto,
  ChangementMotDePasseDto,
  KpiPlateforme,
  AuditLog,
  AuditFilterDto,
  ReglePlateforme,
  ReglePlateformeCreateDto,
  ReglePlateformeUpdateDto,
  DemandeSuppression,
  DemandeSuppressionDecisionDto,
  StatutDemandeSuppression
} from '../../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class AdminSystemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin-systeme`;

  // --- GESTION DES SALONS ---

  creerSalon(request: SalonCreateDto): Observable<ApiResponse<Salon>> {
    return this.http.post<ApiResponse<Salon>>(`${this.baseUrl}/salons`, request);
  }

  listerSalons(): Observable<ApiResponse<Salon[]>> {
    return this.http.get<ApiResponse<Salon[]>>(`${this.baseUrl}/salons`);
  }

  getSalon(slug: string): Observable<ApiResponse<Salon>> {
    return this.http.get<ApiResponse<Salon>>(`${this.baseUrl}/salons/${slug}`);
  }

  desactiverSalon(slug: string): Observable<ApiResponse<Salon>> {
    return this.http.patch<ApiResponse<Salon>>(`${this.baseUrl}/salons/${slug}/desactiver`, {});
  }

  reactiverSalon(slug: string): Observable<ApiResponse<Salon>> {
    return this.http.patch<ApiResponse<Salon>>(`${this.baseUrl}/salons/${slug}/reactiver`, {});
  }

  // --- GESTION DU COMPTE ---

  getProfil(): Observable<ApiResponse<Compte>> {
    return this.http.get<ApiResponse<Compte>>(`${this.baseUrl}/compte`);
  }

  updateProfil(request: CompteUpdateDto): Observable<ApiResponse<Compte>> {
    return this.http.put<ApiResponse<Compte>>(`${this.baseUrl}/compte`, request);
  }

  changerMotDePasse(request: ChangementMotDePasseDto): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/compte/mot-de-passe`, request);
  }

  // --- DASHBOARD & KPIS ---

  getKpiPlateforme(): Observable<ApiResponse<KpiPlateforme>> {
    return this.http.get<ApiResponse<KpiPlateforme>>(`${this.baseUrl}/kpi`);
  }

  // --- AUDIT ---

  listerLogs(filtre?: AuditFilterDto): Observable<ApiResponse<AuditLog[]>> {
    let params = new HttpParams();
    if (filtre?.action) {
      params = params.set('action', filtre.action);
    }
    if (filtre?.entite) {
      params = params.set('entite', filtre.entite);
    }
    if (filtre?.dateDebut) {
      params = params.set('dateDebut', filtre.dateDebut);
    }
    if (filtre?.dateFin) {
      params = params.set('dateFin', filtre.dateFin);
    }
    return this.http.get<ApiResponse<AuditLog[]>>(`${this.baseUrl}/audit`, { params });
  }

  rechercherLogs(motCle: string): Observable<ApiResponse<AuditLog[]>> {
    const params = new HttpParams().set('motCle', motCle);
    return this.http.get<ApiResponse<AuditLog[]>>(`${this.baseUrl}/audit/recherche`, { params });
  }

  listerActionsSensibles(): Observable<ApiResponse<AuditLog[]>> {
    return this.http.get<ApiResponse<AuditLog[]>>(`${this.baseUrl}/audit/actions-sensibles`);
  }

  getLogById(id: number): Observable<ApiResponse<AuditLog>> {
    return this.http.get<ApiResponse<AuditLog>>(`${this.baseUrl}/audit/${id}`);
  }

  // --- RÈGLES DE LA PLATEFORME ---

  creerRegle(request: ReglePlateformeCreateDto): Observable<ApiResponse<ReglePlateforme>> {
    return this.http.post<ApiResponse<ReglePlateforme>>(`${this.baseUrl}/regles`, request);
  }

  listerRegles(): Observable<ApiResponse<ReglePlateforme[]>> {
    return this.http.get<ApiResponse<ReglePlateforme[]>>(`${this.baseUrl}/regles`);
  }

  listerReglesActives(): Observable<ApiResponse<ReglePlateforme[]>> {
    return this.http.get<ApiResponse<ReglePlateforme[]>>(`${this.baseUrl}/regles/actives`);
  }

  getRegle(id: number): Observable<ApiResponse<ReglePlateforme>> {
    return this.http.get<ApiResponse<ReglePlateforme>>(`${this.baseUrl}/regles/${id}`);
  }

  modifierRegle(id: number, request: ReglePlateformeUpdateDto): Observable<ApiResponse<ReglePlateforme>> {
    return this.http.put<ApiResponse<ReglePlateforme>>(`${this.baseUrl}/regles/${id}`, request);
  }

  activerRegle(id: number): Observable<ApiResponse<ReglePlateforme>> {
    return this.http.patch<ApiResponse<ReglePlateforme>>(`${this.baseUrl}/regles/${id}/activer`, {});
  }

  desactiverRegle(id: number): Observable<ApiResponse<ReglePlateforme>> {
    return this.http.patch<ApiResponse<ReglePlateforme>>(`${this.baseUrl}/regles/${id}/desactiver`, {});
  }

  // --- RGPD ---

  listerDemandesSuppression(statut?: StatutDemandeSuppression): Observable<ApiResponse<DemandeSuppression[]>> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http.get<ApiResponse<DemandeSuppression[]>>(`${this.baseUrl}/rgpd/suppressions`, { params });
  }

  obtenirDemandeSuppression(id: number): Observable<ApiResponse<DemandeSuppression>> {
    return this.http.get<ApiResponse<DemandeSuppression>>(`${this.baseUrl}/rgpd/suppressions/${id}`);
  }

  traiterDemandeSuppression(id: number, request: DemandeSuppressionDecisionDto): Observable<ApiResponse<DemandeSuppression>> {
    return this.http.patch<ApiResponse<DemandeSuppression>>(`${this.baseUrl}/rgpd/suppressions/${id}/decision`, request);
  }
}
