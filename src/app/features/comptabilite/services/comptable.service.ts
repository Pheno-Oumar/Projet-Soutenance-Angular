import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  SessionCaisse,
  OuvertureCaisseDto,
  FermetureCaisseDto,
  OperationCaisse,
  Compte,
  CompteUpdateDto,
  ChangementMotDePasseDto,
  Depense,
  DepenseCreateDto,
  CategorieDepense,
  RapportFinancier,
  RapportFinancierFiltreDto,
  RapportExport,
  KpiFinancier
} from '../../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ComptableService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private getUrl(slugSalon: string, path: string): string {
    return `${this.baseUrl}/${slugSalon}/comptable${path}`;
  }

  // --- GESTION DE LA CAISSE ---

  ouvrirSession(slugSalon: string, request: OuvertureCaisseDto): Observable<ApiResponse<SessionCaisse>> {
    return this.http.post<ApiResponse<SessionCaisse>>(this.getUrl(slugSalon, '/caisse/sessions'), request);
  }

  cloturerSession(slugSalon: string, request: FermetureCaisseDto): Observable<ApiResponse<SessionCaisse>> {
    return this.http.put<ApiResponse<SessionCaisse>>(this.getUrl(slugSalon, '/caisse/sessions/courante/cloturer'), request);
  }

  getSessionCourante(slugSalon: string): Observable<ApiResponse<SessionCaisse>> {
    return this.http.get<ApiResponse<SessionCaisse>>(this.getUrl(slugSalon, '/caisse/sessions/courante'));
  }

  getHistoriqueSessions(slugSalon: string): Observable<ApiResponse<SessionCaisse[]>> {
    return this.http.get<ApiResponse<SessionCaisse[]>>(this.getUrl(slugSalon, '/caisse/sessions'));
  }

  getOperationsSession(slugSalon: string, sessionId: number): Observable<ApiResponse<OperationCaisse[]>> {
    return this.http.get<ApiResponse<OperationCaisse[]>>(this.getUrl(slugSalon, `/caisse/sessions/${sessionId}/operations`));
  }

  // --- GESTION DU COMPTE ---

  getCompte(slugSalon: string): Observable<ApiResponse<Compte>> {
    return this.http.get<ApiResponse<Compte>>(this.getUrl(slugSalon, '/compte'));
  }

  updateCompte(slugSalon: string, request: CompteUpdateDto): Observable<ApiResponse<Compte>> {
    return this.http.put<ApiResponse<Compte>>(this.getUrl(slugSalon, '/compte'), request);
  }

  changerMotDePasse(slugSalon: string, request: ChangementMotDePasseDto): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(this.getUrl(slugSalon, '/compte/mot-de-passe'), request);
  }

  // --- GESTION DES DÉPENSES ---

  creerDepense(slugSalon: string, request: DepenseCreateDto): Observable<ApiResponse<Depense>> {
    return this.http.post<ApiResponse<Depense>>(this.getUrl(slugSalon, '/depenses'), request);
  }

  listerDepenses(slugSalon: string, categorie?: CategorieDepense, statut?: boolean): Observable<ApiResponse<Depense[]>> {
    let params = new HttpParams();
    if (categorie) {
      params = params.set('categorie', categorie);
    }
    if (statut !== undefined && statut !== null) {
      params = params.set('statut', statut.toString());
    }
    return this.http.get<ApiResponse<Depense[]>>(this.getUrl(slugSalon, '/depenses'), { params });
  }

  obtenirDepense(slugSalon: string, id: number): Observable<ApiResponse<Depense>> {
    return this.http.get<ApiResponse<Depense>>(this.getUrl(slugSalon, `/depenses/${id}`));
  }

  annulerDepense(slugSalon: string, id: number): Observable<ApiResponse<Depense>> {
    return this.http.patch<ApiResponse<Depense>>(this.getUrl(slugSalon, `/depenses/${id}/annuler`), {});
  }

  // --- RAPPORTS & KPI FINANCIERS ---

  consulterRapport(slugSalon: string, filtre: RapportFinancierFiltreDto): Observable<ApiResponse<RapportFinancier>> {
    return this.http.post<ApiResponse<RapportFinancier>>(this.getUrl(slugSalon, '/rapports/consulter'), filtre);
  }

  exporterRapport(slugSalon: string, filtre: RapportFinancierFiltreDto): Observable<ApiResponse<RapportExport>> {
    return this.http.post<ApiResponse<RapportExport>>(this.getUrl(slugSalon, '/rapports/exporter'), filtre);
  }

  getKpiFinanciers(slugSalon: string): Observable<ApiResponse<KpiFinancier>> {
    return this.http.get<ApiResponse<KpiFinancier>>(this.getUrl(slugSalon, '/rapports/kpi'));
  }

  listerMesExports(slugSalon: string): Observable<ApiResponse<RapportExport[]>> {
    return this.http.get<ApiResponse<RapportExport[]>>(this.getUrl(slugSalon, '/rapports/mes-exports'));
  }

  telechargerExport(slugSalon: string, exportId: number): Observable<Blob> {
    return this.http.get(this.getUrl(slugSalon, `/rapports/exports/${exportId}/telecharger`), {
      responseType: 'blob'
    });
  }
}
