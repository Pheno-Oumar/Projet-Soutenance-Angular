import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Compte,
  CompteUpdateDto,
  ProfilCapillaire,
  ProfilCapillaireDto,
  CodeProfilDto,
  RendezVous,
  Prestation,
  Paiement,
  FavoriSalon,
  FavoriCoiffeur,
  AvisSalon,
  AvisPrestation,
  Panier,
  Commande,
  Reclamation,
  DemandeSuppression
} from '../../shared/models';

export interface ReclamationCreateDto {
  objet: string;
  description: string;
}

export interface DemandeExportDto {
  format?: string;
  motif?: string;
}

export interface DemandeExportResponse {
  id: number;
  dateDemande: string;
  statut: string;
  fichierUrl?: string;
}

export interface DemandeSuppressionDto {
  motif?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientPlateformeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // ==========================================
  // 1. COMPTE PERSONNEL
  // ==========================================

  getCompte(): Observable<Compte> {
    return this.http
      .get<ApiResponse<Compte>>(`${this.baseUrl}/client/compte`)
      .pipe(map((res) => res.data));
  }

  updateCompte(dto: CompteUpdateDto): Observable<Compte> {
    const cleanDto = {
      ...dto,
      dateNaissance: dto.dateNaissance && dto.dateNaissance.trim() ? dto.dateNaissance : null
    };
    return this.http
      .put<ApiResponse<Compte>>(`${this.baseUrl}/client/compte`, cleanDto)
      .pipe(map((res) => res.data));
  }

  changerMotDePasse(ancienMotDePasse: string, nouveauMotDePasse: string): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.baseUrl}/client/compte/mot-de-passe`, {
        ancienMotDePasse,
        nouveauMotDePasse
      })
      .pipe(map(() => void 0));
  }

  // ==========================================
  // 2. PROFIL CAPILLAIRE
  // ==========================================

  getProfilCapillaire(): Observable<ProfilCapillaire> {
    return this.http
      .get<ApiResponse<ProfilCapillaire>>(`${this.baseUrl}/client/profil-capillaire`)
      .pipe(map((res) => res.data));
  }

  updateProfilCapillaire(dto: ProfilCapillaireDto): Observable<ProfilCapillaire> {
    return this.http
      .put<ApiResponse<ProfilCapillaire>>(`${this.baseUrl}/client/profil-capillaire`, dto)
      .pipe(map((res) => res.data));
  }

  changerCodeProfil(codePin: string): Observable<void> {
    const dto: CodeProfilDto = { codePin };
    return this.http
      .patch<ApiResponse<void>>(`${this.baseUrl}/client/profil-capillaire/code`, dto)
      .pipe(map(() => void 0));
  }

  // ==========================================
  // 3. RENDEZ-VOUS MULTI-SALONS
  // ==========================================

  listerMesRendezVous(slugSalon?: string): Observable<RendezVous[]> {
    let params = new HttpParams();
    if (slugSalon) {
      params = params.set('slugSalon', slugSalon);
    }
    return this.http
      .get<ApiResponse<RendezVous[]>>(`${this.baseUrl}/client/rendez-vous`, { params })
      .pipe(map((res) => res.data));
  }

  getDetailRendezVous(id: number): Observable<RendezVous> {
    return this.http
      .get<ApiResponse<RendezVous>>(`${this.baseUrl}/client/rendez-vous/${id}`)
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 4. PRESTATIONS & PAIEMENTS MULTI-SALONS
  // ==========================================

  listerMesPrestations(slugSalon?: string): Observable<Prestation[]> {
    let params = new HttpParams();
    if (slugSalon) {
      params = params.set('slugSalon', slugSalon);
    }
    return this.http
      .get<ApiResponse<Prestation[]>>(`${this.baseUrl}/client/prestations`, { params })
      .pipe(map((res) => res.data));
  }

  getDetailPrestation(id: number): Observable<Prestation> {
    return this.http
      .get<ApiResponse<Prestation>>(`${this.baseUrl}/client/prestations/${id}`)
      .pipe(map((res) => res.data));
  }

  listerMesPaiements(slugSalon?: string): Observable<Paiement[]> {
    let params = new HttpParams();
    if (slugSalon) {
      params = params.set('slugSalon', slugSalon);
    }
    return this.http
      .get<ApiResponse<Paiement[]>>(`${this.baseUrl}/client/paiements`, { params })
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 5. FAVORIS (SALONS & COIFFEURS)
  // ==========================================

  listerMesSalonsFavoris(): Observable<FavoriSalon[]> {
    return this.http
      .get<ApiResponse<FavoriSalon[]>>(`${this.baseUrl}/client/favoris/salons`)
      .pipe(map((res) => res.data));
  }

  listerMesCoiffeursFavoris(): Observable<FavoriCoiffeur[]> {
    return this.http
      .get<ApiResponse<FavoriCoiffeur[]>>(`${this.baseUrl}/client/favoris/coiffeurs`)
      .pipe(map((res) => res.data));
  }

  ajouterSalonFavori(slugSalon: string): Observable<FavoriSalon> {
    return this.http
      .post<ApiResponse<FavoriSalon>>(`${this.baseUrl}/client/favoris/${slugSalon}`, {})
      .pipe(map((res) => res.data));
  }

  retirerSalonFavori(slugSalon: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/client/favoris/${slugSalon}`)
      .pipe(map(() => void 0));
  }

  // ==========================================
  // 6. AVIS
  // ==========================================

  listerMesAvisSalons(): Observable<AvisSalon[]> {
    return this.http
      .get<ApiResponse<AvisSalon[]>>(`${this.baseUrl}/client/avis/salons`)
      .pipe(map((res) => res.data));
  }

  listerMesAvisPrestations(): Observable<AvisPrestation[]> {
    return this.http
      .get<ApiResponse<AvisPrestation[]>>(`${this.baseUrl}/client/avis/prestations`)
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 7. PANIERS & COMMANDES
  // ==========================================

  listerMesPaniers(): Observable<Panier[]> {
    return this.http
      .get<ApiResponse<Panier[]>>(`${this.baseUrl}/client/paniers`)
      .pipe(map((res) => res.data));
  }

  viderTousMesPaniers(): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/client/paniers`)
      .pipe(map(() => void 0));
  }

  listerMesCommandes(): Observable<Commande[]> {
    return this.http
      .get<ApiResponse<Commande[]>>(`${this.baseUrl}/client/commandes`)
      .pipe(map((res) => res.data));
  }

  getDetailCommande(id: number): Observable<Commande> {
    return this.http
      .get<ApiResponse<Commande>>(`${this.baseUrl}/client/commandes/${id}`)
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 8. RÉCLAMATIONS
  // ==========================================

  listerMesReclamations(): Observable<Reclamation[]> {
    return this.http
      .get<ApiResponse<Reclamation[]>>(`${this.baseUrl}/client/reclamations`)
      .pipe(map((res) => res.data));
  }

  deposerReclamation(slugSalon: string, dto: ReclamationCreateDto): Observable<Reclamation> {
    const params = new HttpParams().set('slugSalon', slugSalon);
    return this.http
      .post<ApiResponse<Reclamation>>(`${this.baseUrl}/client/reclamations`, dto, { params })
      .pipe(map((res) => res.data));
  }

  // ==========================================
  // 9. RGPD
  // ==========================================

  demanderExportDonnees(dto?: DemandeExportDto): Observable<DemandeExportResponse> {
    return this.http
      .post<ApiResponse<DemandeExportResponse>>(`${this.baseUrl}/client/rgpd/export`, dto || {})
      .pipe(map((res) => res.data));
  }

  demanderSuppressionCompte(dto?: DemandeSuppressionDto): Observable<DemandeSuppression> {
    return this.http
      .post<ApiResponse<DemandeSuppression>>(
        `${this.baseUrl}/client/rgpd/suppression`,
        dto || {}
      )
      .pipe(map((res) => res.data));
  }

  consulterSuiviSuppression(): Observable<DemandeSuppression[]> {
    return this.http
      .get<ApiResponse<DemandeSuppression[]>>(`${this.baseUrl}/client/rgpd/suivi`)
      .pipe(map((res) => res.data));
  }
}
