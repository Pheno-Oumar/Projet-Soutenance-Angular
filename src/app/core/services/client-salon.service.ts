import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  RendezVous,
  RendezVousCreateDto,
  RendezVousAnnulationDto,
  Prestation,
  Paiement,
  AvisPrestation,
  AvisSalon,
  FavoriSalon,
  FavoriCoiffeur,
  Commande,
  Reclamation
} from '../../shared/models';

export interface AvisPrestationCreateDto {
  lignePrestationId: number;
  note: number;
  commentaire?: string;
}

export interface AvisSalonCreateDto {
  note: number;
  commentaire?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientSalonService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // ==========================================
  // 1. RENDEZ-VOUS DANS CE SALON
  // ==========================================

  reserverRendezVous(slugSalon: string, request: RendezVousCreateDto): Observable<RendezVous> {
    return this.http
      .post<ApiResponse<RendezVous>>(`${this.baseUrl}/${slugSalon}/client/rendez-vous`, request)
      .pipe(map((res) => res.data));
  }

  listerMesRendezVous(slugSalon: string): Observable<RendezVous[]> {
    return this.http
      .get<ApiResponse<RendezVous[]>>(`${this.baseUrl}/${slugSalon}/client/rendez-vous`)
      .pipe(map((res) => res.data));
  }

  getDetailRendezVous(slugSalon: string, id: number): Observable<RendezVous> {
    return this.http
      .get<ApiResponse<RendezVous>>(`${this.baseUrl}/${slugSalon}/client/rendez-vous/${id}`)
      .pipe(map((res) => res.data));
  }

  annulerRendezVous(
    slugSalon: string,
    id: number,
    request: RendezVousAnnulationDto
  ): Observable<RendezVous> {
    return this.http
      .patch<ApiResponse<RendezVous>>(
        `${this.baseUrl}/${slugSalon}/client/rendez-vous/${id}/annuler`,
        request
      )
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 2. PRESTATIONS & PAIEMENTS DANS CE SALON
  // ==========================================

  listerMesPrestations(slugSalon: string): Observable<Prestation[]> {
    return this.http
      .get<ApiResponse<Prestation[]>>(`${this.baseUrl}/${slugSalon}/client/prestations`)
      .pipe(map((res) => res.data));
  }

  getDetailPrestation(slugSalon: string, id: number): Observable<Prestation> {
    return this.http
      .get<ApiResponse<Prestation>>(`${this.baseUrl}/${slugSalon}/client/prestations/${id}`)
      .pipe(map((res) => res.data));
  }

  listerMesPaiements(slugSalon: string): Observable<Paiement[]> {
    return this.http
      .get<ApiResponse<Paiement[]>>(`${this.baseUrl}/${slugSalon}/client/paiements`)
      .pipe(map((res) => res.data));
  }

  getDetailPaiement(slugSalon: string, id: number): Observable<Paiement> {
    return this.http
      .get<ApiResponse<Paiement>>(`${this.baseUrl}/${slugSalon}/client/paiements/${id}`)
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 3. AVIS (PRESTATIONS & SALON)
  // ==========================================

  creerAvisPrestation(
    slugSalon: string,
    request: AvisPrestationCreateDto
  ): Observable<AvisPrestation> {
    return this.http
      .post<ApiResponse<AvisPrestation>>(
        `${this.baseUrl}/${slugSalon}/client/avis/prestations`,
        request
      )
      .pipe(map((res) => res.data));
  }

  modifierAvisPrestation(
    slugSalon: string,
    id: number,
    request: Partial<AvisPrestationCreateDto>
  ): Observable<AvisPrestation> {
    return this.http
      .put<ApiResponse<AvisPrestation>>(
        `${this.baseUrl}/${slugSalon}/client/avis/prestations/${id}`,
        request
      )
      .pipe(map((res) => res.data));
  }

  supprimerAvisPrestation(slugSalon: string, id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${slugSalon}/client/avis/prestations/${id}`)
      .pipe(map(() => void 0));
  }

  listerMesAvisPrestations(slugSalon: string): Observable<AvisPrestation[]> {
    return this.http
      .get<ApiResponse<AvisPrestation[]>>(
        `${this.baseUrl}/${slugSalon}/client/avis/prestations/mes-avis`
      )
      .pipe(map((res) => res.data));
  }

  creerAvisSalon(slugSalon: string, request: AvisSalonCreateDto): Observable<AvisSalon> {
    return this.http
      .post<ApiResponse<AvisSalon>>(`${this.baseUrl}/${slugSalon}/client/avis/salon`, request)
      .pipe(map((res) => res.data));
  }

  modifierAvisSalon(slugSalon: string, request: AvisSalonCreateDto): Observable<AvisSalon> {
    return this.http
      .put<ApiResponse<AvisSalon>>(`${this.baseUrl}/${slugSalon}/client/avis/salon`, request)
      .pipe(map((res) => res.data));
  }

  supprimerAvisSalon(slugSalon: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${slugSalon}/client/avis/salon`)
      .pipe(map(() => void 0));
  }

  getMonAvisSalon(slugSalon: string): Observable<AvisSalon> {
    return this.http
      .get<ApiResponse<AvisSalon>>(`${this.baseUrl}/${slugSalon}/client/avis/salon/mon-avis`)
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 4. FAVORIS DANS CE SALON
  // ==========================================

  ajouterSalonFavori(slugSalon: string): Observable<FavoriSalon> {
    return this.http
      .post<ApiResponse<FavoriSalon>>(`${this.baseUrl}/${slugSalon}/client/favoris/salon`, {})
      .pipe(map((res) => res.data));
  }

  retirerSalonFavori(slugSalon: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${slugSalon}/client/favoris/salon`)
      .pipe(map(() => void 0));
  }

  isSalonFavori(slugSalon: string): Observable<boolean> {
    return this.http
      .get<ApiResponse<boolean>>(`${this.baseUrl}/${slugSalon}/client/favoris/salon/status`)
      .pipe(map((res) => res.data));
  }

  ajouterCoiffeurFavori(slugSalon: string, coiffeurId: number): Observable<FavoriCoiffeur> {
    return this.http
      .post<ApiResponse<FavoriCoiffeur>>(
        `${this.baseUrl}/${slugSalon}/client/favoris/coiffeurs/${coiffeurId}`,
        {}
      )
      .pipe(map((res) => res.data));
  }

  retirerCoiffeurFavori(slugSalon: string, coiffeurId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(
        `${this.baseUrl}/${slugSalon}/client/favoris/coiffeurs/${coiffeurId}`
      )
      .pipe(map(() => void 0));
  }

  listerMesCoiffeursFavoris(slugSalon: string): Observable<FavoriCoiffeur[]> {
    return this.http
      .get<ApiResponse<FavoriCoiffeur[]>>(`${this.baseUrl}/${slugSalon}/client/favoris/coiffeurs`)
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 5. COMMANDES DE PRODUITS DANS CE SALON
  // ==========================================

  passerCommande(slugSalon: string): Observable<Commande> {
    return this.http
      .post<ApiResponse<Commande>>(`${this.baseUrl}/${slugSalon}/client/commandes`, {})
      .pipe(map((res) => res.data));
  }

  listerCommandes(slugSalon: string): Observable<Commande[]> {
    return this.http
      .get<ApiResponse<Commande[]>>(`${this.baseUrl}/${slugSalon}/client/commandes`)
      .pipe(map((res) => res.data));
  }

  obtenirCommande(slugSalon: string, id: number): Observable<Commande> {
    return this.http
      .get<ApiResponse<Commande>>(`${this.baseUrl}/${slugSalon}/client/commandes/${id}`)
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 6. RÉCLAMATIONS DANS CE SALON
  // ==========================================

  deposerReclamation(
    slugSalon: string,
    request: { objet: string; description: string }
  ): Observable<Reclamation> {
    return this.http
      .post<ApiResponse<Reclamation>>(
        `${this.baseUrl}/${slugSalon}/client/reclamations`,
        request
      )
      .pipe(map((res) => res.data));
  }

  listerMesReclamations(slugSalon: string): Observable<Reclamation[]> {
    return this.http
      .get<ApiResponse<Reclamation[]>>(`${this.baseUrl}/${slugSalon}/client/reclamations`)
      .pipe(map((res) => res.data));
  }

  obtenirMaReclamation(slugSalon: string, id: number): Observable<Reclamation> {
    return this.http
      .get<ApiResponse<Reclamation>>(
        `${this.baseUrl}/${slugSalon}/client/reclamations/${id}`
      )
      .pipe(map((res) => res.data));
  }
}
