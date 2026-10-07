import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  Salon,
  SalonUpdateDto,
  SalonUpdateNomDto,
  HoraireSalon,
  FermetureExceptionnelle,
  FermetureExceptionnelleCreateDto,
  FermetureExceptionnelleUpdateDto,
  Employe,
  EmployeCreateDto,
  EmployeRoleUpdateDto,
  TransfertProprieteDto,
  PrestationCatalogue,
  PrestationCatalogueCreateDto,
  ServiceSalonCreateDto,
  ServiceSalonUpdateDto,
  VarianteServiceDto,
  VarianteCreateDto,
  VarianteUpdateDto,
  VariantePrixUpdateDto,
  Compte,
  CompteUpdateDto,
  ChangementMotDePasseDto,
  Indisponibilite,
  IndisponibiliteDto,
  PlanningRendezVousDto,
  KpiSalon,
  PerformanceCoiffeur,
  Paiement,
  Depense,
  StockSynthese,
  ClientSalonResume,
  FicheClientComplete,
  RegleSalon,
  RegleSalonCreateDto,
  RegleSalonUpdateDto,
  AuditLog,
  AuditFilterDto,
  RapportFinancier,
  RapportFinancierFiltreDto,
  RapportExport,
  KpiFinancier
} from '../../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ProprietaireService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private getUrl(slugSalon: string, path: string): string {
    return `${this.baseUrl}/${slugSalon}/proprietaire${path}`;
  }

  // --- GESTION DU SALON ---

  getSalon(slugSalon: string): Observable<ApiResponse<Salon>> {
    return this.http.get<ApiResponse<Salon>>(this.getUrl(slugSalon, '/salon'));
  }

  updateSalon(slugSalon: string, request: SalonUpdateDto | SalonUpdateNomDto): Observable<ApiResponse<Salon>> {
    return this.http.put<ApiResponse<Salon>>(this.getUrl(slugSalon, '/salon'), request);
  }

  uploadLogo(slugSalon: string, file: File): Observable<ApiResponse<Salon>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch<ApiResponse<Salon>>(this.getUrl(slugSalon, '/salon/logo'), formData);
  }

  // --- GESTION DES EMPLOYÉS ---

  creerEmploye(slugSalon: string, request: EmployeCreateDto): Observable<ApiResponse<Employe>> {
    return this.http.post<ApiResponse<Employe>>(this.getUrl(slugSalon, '/employes'), request);
  }

  listerEmployes(slugSalon: string): Observable<ApiResponse<Employe[]>> {
    return this.http.get<ApiResponse<Employe[]>>(this.getUrl(slugSalon, '/employes'));
  }

  getEmploye(slugSalon: string, affectationId: number): Observable<ApiResponse<Employe>> {
    return this.http.get<ApiResponse<Employe>>(this.getUrl(slugSalon, `/employes/${affectationId}`));
  }

  updateRoles(slugSalon: string, affectationId: number, request: EmployeRoleUpdateDto): Observable<ApiResponse<Employe>> {
    return this.http.put<ApiResponse<Employe>>(this.getUrl(slugSalon, `/employes/${affectationId}/roles`), request);
  }

  desactiverEmploye(slugSalon: string, affectationId: number): Observable<ApiResponse<Employe>> {
    return this.http.patch<ApiResponse<Employe>>(this.getUrl(slugSalon, `/employes/${affectationId}/desactiver`), {});
  }

  reactiverEmploye(slugSalon: string, affectationId: number): Observable<ApiResponse<Employe>> {
    return this.http.patch<ApiResponse<Employe>>(this.getUrl(slugSalon, `/employes/${affectationId}/reactiver`), {});
  }

  // --- RÔLES DU PROPRIÉTAIRE & CESSION / TRANSFERT ---

  getMesRoles(slugSalon: string): Observable<ApiResponse<Employe>> {
    return this.http.get<ApiResponse<Employe>>(this.getUrl(slugSalon, '/mes-roles'));
  }

  updateMesRoles(slugSalon: string, roles: string[]): Observable<ApiResponse<Employe>> {
    return this.http.put<ApiResponse<Employe>>(this.getUrl(slugSalon, '/mes-roles'), { roles });
  }

  transfererPropriete(slugSalon: string, request: TransfertProprieteDto): Observable<ApiResponse<Salon>> {
    return this.http.post<ApiResponse<Salon>>(this.getUrl(slugSalon, '/transfert'), request);
  }

  // --- GESTION DES HORAIRES ET FERMETURES ---

  definirHoraire(slugSalon: string, request: HoraireSalon): Observable<ApiResponse<HoraireSalon>> {
    return this.http.put<ApiResponse<HoraireSalon>>(this.getUrl(slugSalon, '/horaires'), request);
  }

  listerHoraires(slugSalon: string): Observable<ApiResponse<HoraireSalon[]>> {
    return this.http.get<ApiResponse<HoraireSalon[]>>(this.getUrl(slugSalon, '/horaires'));
  }

  ajouterFermeture(slugSalon: string, request: FermetureExceptionnelleCreateDto): Observable<ApiResponse<FermetureExceptionnelle>> {
    return this.http.post<ApiResponse<FermetureExceptionnelle>>(this.getUrl(slugSalon, '/fermetures'), request);
  }

  listerFermetures(slugSalon: string): Observable<ApiResponse<FermetureExceptionnelle[]>> {
    return this.http.get<ApiResponse<FermetureExceptionnelle[]>>(this.getUrl(slugSalon, '/fermetures'));
  }

  supprimerFermeture(slugSalon: string, id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.getUrl(slugSalon, `/fermetures/${id}`));
  }

  modifierFermeture(slugSalon: string, id: number, request: FermetureExceptionnelleCreateDto | FermetureExceptionnelleUpdateDto): Observable<ApiResponse<FermetureExceptionnelle>> {
    return this.http.put<ApiResponse<FermetureExceptionnelle>>(this.getUrl(slugSalon, `/fermetures/${id}`), request);
  }

  mettreFinFermeture(slugSalon: string, id: number): Observable<ApiResponse<FermetureExceptionnelle>> {
    return this.http.patch<ApiResponse<FermetureExceptionnelle>>(this.getUrl(slugSalon, `/fermetures/${id}/mettre-fin`), {});
  }

  // --- GESTION DES SERVICES ET VARIANTES ---

  creerService(slugSalon: string, data: ServiceSalonCreateDto | PrestationCatalogueCreateDto, image?: File): Observable<ApiResponse<PrestationCatalogue>> {
    const formData = new FormData();
    const dataBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('data', dataBlob);
    if (image) {
      formData.append('image', image);
    }
    return this.http.post<ApiResponse<PrestationCatalogue>>(this.getUrl(slugSalon, '/services'), formData);
  }

  listerServices(slugSalon: string, inclureInactifs = false): Observable<ApiResponse<PrestationCatalogue[]>> {
    const params = new HttpParams().set('inclureInactifs', inclureInactifs.toString());
    return this.http.get<ApiResponse<PrestationCatalogue[]>>(this.getUrl(slugSalon, '/services'), { params });
  }

  getService(slugSalon: string, id: number): Observable<ApiResponse<PrestationCatalogue>> {
    return this.http.get<ApiResponse<PrestationCatalogue>>(this.getUrl(slugSalon, `/services/${id}`));
  }

  modifierService(slugSalon: string, id: number, request: ServiceSalonUpdateDto): Observable<ApiResponse<PrestationCatalogue>> {
    return this.http.put<ApiResponse<PrestationCatalogue>>(this.getUrl(slugSalon, `/services/${id}`), request);
  }

  uploadImageService(slugSalon: string, id: number, file: File): Observable<ApiResponse<PrestationCatalogue>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch<ApiResponse<PrestationCatalogue>>(this.getUrl(slugSalon, `/services/${id}/image`), formData);
  }

  basculerStatutService(slugSalon: string, id: number): Observable<ApiResponse<PrestationCatalogue>> {
    return this.http.patch<ApiResponse<PrestationCatalogue>>(this.getUrl(slugSalon, `/services/${id}/statut`), {});
  }

  ajouterVariante(slugSalon: string, serviceId: number, data: VarianteCreateDto, image?: File): Observable<ApiResponse<VarianteServiceDto>> {
    const formData = new FormData();
    const dataBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('data', dataBlob);
    if (image) {
      formData.append('image', image);
    }
    return this.http.post<ApiResponse<VarianteServiceDto>>(this.getUrl(slugSalon, `/services/${serviceId}/variantes`), formData);
  }

  modifierVariante(slugSalon: string, serviceId: number, varId: number, request: VarianteUpdateDto): Observable<ApiResponse<VarianteServiceDto>> {
    return this.http.put<ApiResponse<VarianteServiceDto>>(this.getUrl(slugSalon, `/services/${serviceId}/variantes/${varId}`), request);
  }

  uploadImageVariante(slugSalon: string, serviceId: number, varId: number, file: File): Observable<ApiResponse<VarianteServiceDto>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch<ApiResponse<VarianteServiceDto>>(this.getUrl(slugSalon, `/services/${serviceId}/variantes/${varId}/image`), formData);
  }

  modifierPrixVariante(slugSalon: string, serviceId: number, varId: number, request: VariantePrixUpdateDto): Observable<ApiResponse<VarianteServiceDto>> {
    return this.http.patch<ApiResponse<VarianteServiceDto>>(this.getUrl(slugSalon, `/services/${serviceId}/variantes/${varId}/prix`), request);
  }

  basculerStatutVariante(slugSalon: string, serviceId: number, varId: number): Observable<ApiResponse<VarianteServiceDto>> {
    return this.http.patch<ApiResponse<VarianteServiceDto>>(this.getUrl(slugSalon, `/services/${serviceId}/variantes/${varId}/statut`), {});
  }

  // --- GESTION DU COMPTE ---

  getProfil(slugSalon: string): Observable<ApiResponse<Compte>> {
    return this.http.get<ApiResponse<Compte>>(this.getUrl(slugSalon, '/compte'));
  }

  updateProfil(slugSalon: string, request: CompteUpdateDto): Observable<ApiResponse<Compte>> {
    return this.http.put<ApiResponse<Compte>>(this.getUrl(slugSalon, '/compte'), request);
  }

  changerMotDePasse(slugSalon: string, request: ChangementMotDePasseDto): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(this.getUrl(slugSalon, '/compte/mot-de-passe'), request);
  }

  // --- GESTION DES INDISPONIBILITÉS COIFFEURS ---

  creerIndisponibilite(slugSalon: string, request: IndisponibiliteDto): Observable<ApiResponse<Indisponibilite>> {
    return this.http.post<ApiResponse<Indisponibilite>>(this.getUrl(slugSalon, '/indisponibilites'), request);
  }

  modifierIndisponibilite(slugSalon: string, id: number, request: IndisponibiliteDto): Observable<ApiResponse<Indisponibilite>> {
    return this.http.put<ApiResponse<Indisponibilite>>(this.getUrl(slugSalon, `/indisponibilites/${id}`), request);
  }

  supprimerIndisponibilite(slugSalon: string, id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.getUrl(slugSalon, `/indisponibilites/${id}`));
  }

  mettreFinIndisponibilite(slugSalon: string, id: number): Observable<ApiResponse<Indisponibilite>> {
    return this.http.patch<ApiResponse<Indisponibilite>>(this.getUrl(slugSalon, `/indisponibilites/${id}/mettre-fin`), {});
  }

  listerIndisponibilites(slugSalon: string, coiffeurAffectationId?: number): Observable<ApiResponse<Indisponibilite[]>> {
    let params = new HttpParams();
    if (coiffeurAffectationId != null) {
      params = params.set('coiffeurAffectationId', coiffeurAffectationId.toString());
    }
    return this.http.get<ApiResponse<Indisponibilite[]>>(this.getUrl(slugSalon, '/indisponibilites'), { params });
  }

  // --- PLANNING DU SALON EN LECTURE SEULE ---

  getPlanning(slugSalon: string, date?: string, coiffeurAffectationId?: number): Observable<ApiResponse<PlanningRendezVousDto[]>> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    if (coiffeurAffectationId != null) {
      params = params.set('coiffeurAffectationId', coiffeurAffectationId.toString());
    }
    return this.http.get<ApiResponse<PlanningRendezVousDto[]>>(this.getUrl(slugSalon, '/planning'), { params });
  }

  // --- PILOTAGE ET REPORTING ---

  getPerformancesCoiffeurs(slugSalon: string): Observable<ApiResponse<PerformanceCoiffeur[]>> {
    return this.http.get<ApiResponse<PerformanceCoiffeur[]>>(this.getUrl(slugSalon, '/performances-coiffeurs'));
  }

  getKpiSalon(slugSalon: string): Observable<ApiResponse<KpiSalon>> {
    return this.http.get<ApiResponse<KpiSalon>>(this.getUrl(slugSalon, '/kpi'));
  }

  getRevenus(slugSalon: string): Observable<ApiResponse<Paiement[]>> {
    return this.http.get<ApiResponse<Paiement[]>>(this.getUrl(slugSalon, '/revenus'));
  }

  getDepenses(slugSalon: string): Observable<ApiResponse<Depense[]>> {
    return this.http.get<ApiResponse<Depense[]>>(this.getUrl(slugSalon, '/depenses'));
  }

  getStock(slugSalon: string): Observable<ApiResponse<StockSynthese[]>> {
    return this.http.get<ApiResponse<StockSynthese[]>>(this.getUrl(slugSalon, '/stock'));
  }

  getClients(slugSalon: string): Observable<ApiResponse<ClientSalonResume[]>> {
    return this.http.get<ApiResponse<ClientSalonResume[]>>(this.getUrl(slugSalon, '/clients'));
  }

  getFicheClientComplete(slugSalon: string, clientId: number): Observable<ApiResponse<FicheClientComplete>> {
    return this.http.get<ApiResponse<FicheClientComplete>>(this.getUrl(slugSalon, `/clients/${clientId}`));
  }

  consulterRapport(slugSalon: string, filtre: RapportFinancierFiltreDto): Observable<ApiResponse<RapportFinancier>> {
    return this.http.post<ApiResponse<RapportFinancier>>(this.getUrl(slugSalon, '/rapports/consulter'), filtre);
  }

  exporterRapport(slugSalon: string, filtre: RapportFinancierFiltreDto): Observable<ApiResponse<RapportExport>> {
    return this.http.post<ApiResponse<RapportExport>>(this.getUrl(slugSalon, '/rapports/exporter'), filtre);
  }

  getKpiFinanciers(slugSalon: string): Observable<ApiResponse<KpiFinancier>> {
    return this.http.get<ApiResponse<KpiFinancier>>(this.getUrl(slugSalon, '/rapports/kpi-financiers'));
  }

  telechargerExport(slugSalon: string, exportId: number): Observable<Blob> {
    return this.http.get(this.getUrl(slugSalon, `/rapports/exports/${exportId}/telecharger`), {
      responseType: 'blob'
    });
  }

  // --- RÈGLES DU SALON ---

  creerRegle(slugSalon: string, request: RegleSalonCreateDto): Observable<ApiResponse<RegleSalon>> {
    return this.http.post<ApiResponse<RegleSalon>>(this.getUrl(slugSalon, '/regles'), request);
  }

  listerRegles(slugSalon: string): Observable<ApiResponse<RegleSalon[]>> {
    return this.http.get<ApiResponse<RegleSalon[]>>(this.getUrl(slugSalon, '/regles'));
  }

  getRegle(slugSalon: string, id: number): Observable<ApiResponse<RegleSalon>> {
    return this.http.get<ApiResponse<RegleSalon>>(this.getUrl(slugSalon, `/regles/${id}`));
  }

  modifierRegle(slugSalon: string, id: number, request: RegleSalonUpdateDto): Observable<ApiResponse<RegleSalon>> {
    return this.http.put<ApiResponse<RegleSalon>>(this.getUrl(slugSalon, `/regles/${id}`), request);
  }

  supprimerRegle(slugSalon: string, id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.getUrl(slugSalon, `/regles/${id}`));
  }

  // --- AUDIT DU SALON ---

  listerLogs(slugSalon: string, filtre?: AuditFilterDto): Observable<ApiResponse<AuditLog[]>> {
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
    return this.http.get<ApiResponse<AuditLog[]>>(this.getUrl(slugSalon, '/audit'), { params });
  }

  rechercherLogs(slugSalon: string, motCle: string): Observable<ApiResponse<AuditLog[]>> {
    const params = new HttpParams().set('motCle', motCle);
    return this.http.get<ApiResponse<AuditLog[]>>(this.getUrl(slugSalon, '/audit/recherche'), { params });
  }

  listerActionsSensibles(slugSalon: string): Observable<ApiResponse<AuditLog[]>> {
    return this.http.get<ApiResponse<AuditLog[]>>(this.getUrl(slugSalon, '/audit/actions-sensibles'));
  }

  getLogById(slugSalon: string, id: number): Observable<ApiResponse<AuditLog>> {
    return this.http.get<ApiResponse<AuditLog>>(this.getUrl(slugSalon, `/audit/${id}`));
  }
}
