import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  Compte,
  CompteUpdateDto,
  ChangementMotDePasseDto,
  ProfilCapillaire,
  CodeProfilVerificationDto,
  ProfilCoiffeur,
  ProfilCoiffeurDto,
  Indisponibilite,
  IndisponibiliteDto,
  PlanningRendezVous,
  AvisPrestation,
  CoiffeurDashboard,
  ClientSalonResume
} from '../../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class CoiffeurService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private getUrl(slugSalon: string, path: string): string {
    return `${this.baseUrl}/${slugSalon}/coiffeur${path}`;
  }

  // --- DASHBOARD COIFFEUR ---

  getDashboard(slugSalon: string): Observable<ApiResponse<CoiffeurDashboard>> {
    return this.http.get<ApiResponse<CoiffeurDashboard>>(this.getUrl(slugSalon, '/dashboard'));
  }

  // --- CLIENTS DU SALON ---

  getClients(slugSalon: string, search?: string): Observable<ApiResponse<ClientSalonResume[]>> {
    let params = new HttpParams();
    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<ClientSalonResume[]>>(this.getUrl(slugSalon, '/clients'), { params });
  }

  // --- PROFIL CAPILLAIRE CLIENT ---

  consulterProfilCapillaireClient(slugSalon: string, clientId: number, request: CodeProfilVerificationDto): Observable<ApiResponse<ProfilCapillaire>> {
    return this.http.post<ApiResponse<ProfilCapillaire>>(this.getUrl(slugSalon, `/profil-capillaire/${clientId}/consulter`), request);
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

  // --- PROFIL PROFESSIONNEL COIFFEUR ---

  getProfil(slugSalon: string): Observable<ApiResponse<ProfilCoiffeur>> {
    return this.http.get<ApiResponse<ProfilCoiffeur>>(this.getUrl(slugSalon, '/profil'));
  }

  updateProfil(slugSalon: string, request: ProfilCoiffeurDto): Observable<ApiResponse<ProfilCoiffeur>> {
    return this.http.put<ApiResponse<ProfilCoiffeur>>(this.getUrl(slugSalon, '/profil'), request);
  }

  uploadPhotoProfil(slugSalon: string, file: File): Observable<ApiResponse<ProfilCoiffeur>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch<ApiResponse<ProfilCoiffeur>>(this.getUrl(slugSalon, '/profil/photo'), formData);
  }

  // --- GESTION DES INDISPONIBILITÉS ---

  ajouterIndisponibilite(slugSalon: string, request: IndisponibiliteDto): Observable<ApiResponse<Indisponibilite>> {
    return this.http.post<ApiResponse<Indisponibilite>>(this.getUrl(slugSalon, '/indisponibilites'), request);
  }

  listerIndisponibilites(slugSalon: string): Observable<ApiResponse<Indisponibilite[]>> {
    return this.http.get<ApiResponse<Indisponibilite[]>>(this.getUrl(slugSalon, '/indisponibilites'));
  }

  supprimerIndisponibilite(slugSalon: string, id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.getUrl(slugSalon, `/indisponibilites/${id}`));
  }

  // --- PLANNING DU COIFFEUR ---

  getPlanning(slugSalon: string, date?: string): Observable<ApiResponse<PlanningRendezVous[]>> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<ApiResponse<PlanningRendezVous[]>>(this.getUrl(slugSalon, '/planning'), { params });
  }

  // --- AVIS DU COIFFEUR ---

  getAvis(slugSalon: string, statut?: boolean): Observable<ApiResponse<AvisPrestation[]>> {
    let params = new HttpParams();
    if (statut !== undefined && statut !== null) {
      params = params.set('statut', statut.toString());
    }
    return this.http.get<ApiResponse<AvisPrestation[]>>(this.getUrl(slugSalon, '/avis'), { params });
  }
}
