import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  Compte,
  CompteUpdateDto,
  ChangementMotDePasseDto,
  PrestationCatalogue,
  PrestationCatalogueCreateDto,
  ServiceSalonCreateDto,
  ServiceSalonUpdateDto,
  VarianteServiceDto,
  VarianteCreateDto,
  VarianteUpdateDto,
  VariantePrixUpdateDto,
  AvisPrestation,
  AvisSalon,
  Realisation,
  RealisationCreateDto,
  RealisationUpdateDto,
  RealisationPublicationDto,
  ClientSalonResume,
  FicheClientManager,
  PlanningRendezVous,
  Indisponibilite,
  IndisponibiliteDto,
  Reclamation,
  ReclamationTraiterDto,
  StatutReclamation,
  ProfilCoiffeur,
  Story,
  CommentaireRealisation
} from '../../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ManagerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private getUrl(slugSalon: string, path: string): string {
    return `${this.baseUrl}/${slugSalon}/manager${path}`;
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

  // --- SERVICES ET VARIANTES ---

  creerService(slugSalon: string, data: PrestationCatalogueCreateDto | ServiceSalonCreateDto, image?: File): Observable<ApiResponse<PrestationCatalogue>> {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
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

  modifierService(slugSalon: string, id: number, request: ServiceSalonUpdateDto | { nom: string; description?: string }): Observable<ApiResponse<PrestationCatalogue>> {
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
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
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

  modifierPrixVariante(slugSalon: string, serviceId: number, varId: number, request: VariantePrixUpdateDto | { nouveauPrix: number }): Observable<ApiResponse<VarianteServiceDto>> {
    return this.http.patch<ApiResponse<VarianteServiceDto>>(this.getUrl(slugSalon, `/services/${serviceId}/variantes/${varId}/prix`), request);
  }

  basculerStatutVariante(slugSalon: string, serviceId: number, varId: number): Observable<ApiResponse<VarianteServiceDto>> {
    return this.http.patch<ApiResponse<VarianteServiceDto>>(this.getUrl(slugSalon, `/services/${serviceId}/variantes/${varId}/statut`), {});
  }

  // --- MODÉRATION DES AVIS ---

  listerAvisPrestations(slugSalon: string, statut?: boolean): Observable<ApiResponse<AvisPrestation[]>> {
    let params = new HttpParams();
    if (statut !== undefined && statut !== null) {
      params = params.set('statut', statut.toString());
    }
    return this.http.get<ApiResponse<AvisPrestation[]>>(this.getUrl(slugSalon, '/avis/prestations'), { params });
  }

  modererAvisPrestation(slugSalon: string, id: number, statut: boolean): Observable<ApiResponse<AvisPrestation>> {
    return this.http.patch<ApiResponse<AvisPrestation>>(this.getUrl(slugSalon, `/avis/prestations/${id}/statut`), { statut });
  }

  listerAvisSalon(slugSalon: string, statut?: boolean): Observable<ApiResponse<AvisSalon[]>> {
    let params = new HttpParams();
    if (statut !== undefined && statut !== null) {
      params = params.set('statut', statut.toString());
    }
    return this.http.get<ApiResponse<AvisSalon[]>>(this.getUrl(slugSalon, '/avis/salon'), { params });
  }

  modererAvisSalon(slugSalon: string, id: number, statut: boolean): Observable<ApiResponse<AvisSalon>> {
    return this.http.patch<ApiResponse<AvisSalon>>(this.getUrl(slugSalon, `/avis/salon/${id}/statut`), { statut });
  }

  // --- GESTION DES RÉALISATIONS ---

  creerRealisation(slugSalon: string, data: RealisationCreateDto, video: File): Observable<ApiResponse<Realisation>> {
    const cleanData: any = {
      titre: data.titre?.trim(),
      description: data.description?.trim() || null,
      publierImmediatement: data.publierImmediatement ?? true
    };
    if (data.coiffeurId != null && !isNaN(Number(data.coiffeurId))) {
      cleanData.coiffeurId = Number(data.coiffeurId);
    }
    if (data.dateRealisation && data.dateRealisation.trim()) {
      cleanData.dateRealisation = data.dateRealisation.trim();
    }

    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(cleanData)], { type: 'application/json' }));
    formData.append('video', video);
    return this.http.post<ApiResponse<Realisation>>(this.getUrl(slugSalon, '/realisations'), formData);
  }

  modifierRealisation(slugSalon: string, id: number, data: RealisationUpdateDto): Observable<ApiResponse<Realisation>> {
    const cleanData: any = {
      titre: data.titre?.trim(),
      description: data.description?.trim() || null
    };
    if (data.coiffeurId != null && !isNaN(Number(data.coiffeurId))) {
      cleanData.coiffeurId = Number(data.coiffeurId);
    }
    if (data.dateRealisation && data.dateRealisation.trim()) {
      cleanData.dateRealisation = data.dateRealisation.trim();
    }

    return this.http.put<ApiResponse<Realisation>>(this.getUrl(slugSalon, `/realisations/${id}`), cleanData);
  }

  uploadVideoRealisation(slugSalon: string, id: number, video: File): Observable<ApiResponse<Realisation>> {
    const formData = new FormData();
    formData.append('file', video);
    return this.http.patch<ApiResponse<Realisation>>(this.getUrl(slugSalon, `/realisations/${id}/video`), formData);
  }

  modifierStatutPublication(slugSalon: string, id: number, request: RealisationPublicationDto): Observable<ApiResponse<Realisation>> {
    return this.http.patch<ApiResponse<Realisation>>(this.getUrl(slugSalon, `/realisations/${id}/publication`), request);
  }

  obtenirRealisation(slugSalon: string, id: number): Observable<ApiResponse<Realisation>> {
    return this.http.get<ApiResponse<Realisation>>(this.getUrl(slugSalon, `/realisations/${id}`));
  }

  listerRealisations(slugSalon: string, statutPublication?: boolean): Observable<ApiResponse<Realisation[]>> {
    let params = new HttpParams();
    if (statutPublication !== undefined && statutPublication !== null) {
      params = params.set('statutPublication', statutPublication.toString());
    }
    return this.http.get<ApiResponse<Realisation[]>>(this.getUrl(slugSalon, '/realisations'), { params });
  }

  supprimerRealisation(slugSalon: string, id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.getUrl(slugSalon, `/realisations/${id}`));
  }

  // --- CLIENTS DU SALON ---

  listerClients(slugSalon: string): Observable<ApiResponse<ClientSalonResume[]>> {
    return this.http.get<ApiResponse<ClientSalonResume[]>>(this.getUrl(slugSalon, '/clients'));
  }

  getClientDetail(slugSalon: string, clientId: number): Observable<ApiResponse<FicheClientManager>> {
    return this.http.get<ApiResponse<FicheClientManager>>(this.getUrl(slugSalon, `/clients/${clientId}`));
  }

  // --- PLANNING DU SALON ---

  getPlanning(slugSalon: string, date?: string, coiffeurAffectationId?: number): Observable<ApiResponse<PlanningRendezVous[]>> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    if (coiffeurAffectationId) {
      params = params.set('coiffeurAffectationId', coiffeurAffectationId.toString());
    }
    return this.http.get<ApiResponse<PlanningRendezVous[]>>(this.getUrl(slugSalon, '/planning'), { params });
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

  listerIndisponibilites(slugSalon: string, coiffeurAffectationId?: number): Observable<ApiResponse<Indisponibilite[]>> {
    let params = new HttpParams();
    if (coiffeurAffectationId != null) {
      params = params.set('coiffeurAffectationId', coiffeurAffectationId.toString());
    }
    return this.http.get<ApiResponse<Indisponibilite[]>>(this.getUrl(slugSalon, '/indisponibilites'), { params });
  }

  // --- RÉCLAMATIONS ---

  listerReclamations(slugSalon: string, statut?: StatutReclamation): Observable<ApiResponse<Reclamation[]>> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http.get<ApiResponse<Reclamation[]>>(`${this.baseUrl}/${slugSalon}/manager/reclamations`, { params });
  }

  obtenirReclamation(slugSalon: string, id: number): Observable<ApiResponse<Reclamation>> {
    return this.http.get<ApiResponse<Reclamation>>(`${this.baseUrl}/${slugSalon}/manager/reclamations/${id}`);
  }

  traiterReclamation(slugSalon: string, id: number, request: ReclamationTraiterDto): Observable<ApiResponse<Reclamation>> {
    return this.http.patch<ApiResponse<Reclamation>>(`${this.baseUrl}/${slugSalon}/manager/reclamations/${id}/traiter`, request);
  }

  // --- COIFFEURS DU SALON ---

  listerCoiffeurs(slugSalon: string): Observable<ApiResponse<ProfilCoiffeur[]>> {
    return this.http.get<ApiResponse<ProfilCoiffeur[]>>(this.getUrl(slugSalon, '/coiffeurs'));
  }

  // --- STORIES DU SALON (24h) ---

  listerStories(slugSalon: string): Observable<Story[]> {
    return this.http.get<Story[]>(this.getUrl(slugSalon, '/stories'));
  }

  publierStory(slugSalon: string, file: File): Observable<Story> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Story>(this.getUrl(slugSalon, '/stories'), formData);
  }

  supprimerStory(slugSalon: string, id: number): Observable<void> {
    return this.http.delete<void>(this.getUrl(slugSalon, `/stories/${id}`));
  }

  // --- MODÉRATION DES COMMENTAIRES DE RÉALISATIONS ---

  listerCommentairesSalon(slugSalon: string): Observable<CommentaireRealisation[]> {
    return this.http.get<CommentaireRealisation[]>(this.getUrl(slugSalon, '/kadys/commentaires'));
  }

  masquerCommentaire(slugSalon: string, id: number): Observable<void> {
    return this.http.patch<void>(this.getUrl(slugSalon, `/kadys/commentaires/${id}/masquer`), {});
  }

  demasquerCommentaire(slugSalon: string, id: number): Observable<void> {
    return this.http.patch<void>(this.getUrl(slugSalon, `/kadys/commentaires/${id}/demasquer`), {});
  }

  supprimerCommentaire(slugSalon: string, id: number): Observable<void> {
    return this.http.delete<void>(this.getUrl(slugSalon, `/kadys/commentaires/${id}`));
  }
}
