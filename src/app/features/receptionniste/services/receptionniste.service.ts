import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  Compte,
  CompteUpdateDto,
  ChangementMotDePasseDto,
  PlanningRendezVousDto,
  CreneauDisponible,
  DisponibiliteSearchDto,
  ClientRapide,
  ClientRapideCreateDto,
  RendezVous,
  RendezVousAnnulationDto,
  RetardRendezVous,
  RetardTraitementDto,
  Prestation,
  Paiement,
  Facture,
  SessionCaisse,
  ReceptionnisteDashboard,
  PrestationCreateDto,
  PaiementRecepteurDto,
  RemboursementRecepteurDto,
  SessionCaisseOuvertureRecepteurDto,
  SessionCaisseClotureRecepteurDto,
  ReceptionnisteRDVCreateDto,
  RemiseFactureDto
} from '../../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ReceptionnisteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private getUrl(slugSalon: string, path: string): string {
    return `${this.baseUrl}/${slugSalon}/receptionniste${path}`;
  }

  // --- TABLEAU DE BORD CENTRALISÉ ---

  getDashboard(slugSalon: string): Observable<ApiResponse<ReceptionnisteDashboard>> {
    return this.http.get<ApiResponse<ReceptionnisteDashboard>>(this.getUrl(slugSalon, '/dashboard'));
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

  // --- PLANNING & DISPONIBILITÉS ---

  consulterPlanning(slugSalon: string, date?: string, coiffeurAffectationId?: number): Observable<ApiResponse<PlanningRendezVousDto[]>> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    if (coiffeurAffectationId) {
      params = params.set('coiffeurAffectationId', coiffeurAffectationId.toString());
    }
    return this.http.get<ApiResponse<PlanningRendezVousDto[]>>(this.getUrl(slugSalon, '/planning'), { params });
  }

  consulterDisponibilites(slugSalon: string, request: DisponibiliteSearchDto): Observable<ApiResponse<CreneauDisponible[]>> {
    return this.http.post<ApiResponse<CreneauDisponible[]>>(this.getUrl(slugSalon, '/disponibilites'), request);
  }

  creerRendezVous(slugSalon: string, request: ReceptionnisteRDVCreateDto): Observable<ApiResponse<RendezVous>> {
    return this.http.post<ApiResponse<RendezVous>>(this.getUrl(slugSalon, '/rendez-vous'), request);
  }

  // --- GESTION DES CLIENTS ---

  rechercherClients(slugSalon: string, query: string): Observable<ApiResponse<ClientRapide[]>> {
    const params = new HttpParams().set('query', query);
    return this.http.get<ApiResponse<ClientRapide[]>>(this.getUrl(slugSalon, '/clients'), { params });
  }

  creerClientRapide(slugSalon: string, request: ClientRapideCreateDto): Observable<ApiResponse<ClientRapide>> {
    return this.http.post<ApiResponse<ClientRapide>>(this.getUrl(slugSalon, '/clients'), request);
  }

  // --- GESTION DES RETARDS & TRAITEMENT DES RENDEZ-VOUS ---

  listerRendezVousEnRetard(slugSalon: string): Observable<ApiResponse<RetardRendezVous[]>> {
    return this.http.get<ApiResponse<RetardRendezVous[]>>(this.getUrl(slugSalon, '/retards'));
  }

  traiterRetard(slugSalon: string, id: number, request: RetardTraitementDto): Observable<ApiResponse<RendezVous>> {
    return this.http.post<ApiResponse<RendezVous>>(this.getUrl(slugSalon, `/retards/${id}/traiter`), request);
  }

  listerHistoriqueRetards(slugSalon: string): Observable<ApiResponse<RetardRendezVous[]>> {
    return this.http.get<ApiResponse<RetardRendezVous[]>>(this.getUrl(slugSalon, '/retards/historique'));
  }

  annulerRendezVous(slugSalon: string, id: number, request: RendezVousAnnulationDto): Observable<ApiResponse<RendezVous>> {
    return this.http.patch<ApiResponse<RendezVous>>(this.getUrl(slugSalon, `/rendez-vous/${id}/annuler`), request);
  }

  // --- PRESTATIONS & FINALISATION ---

  creerPrestation(slugSalon: string, request: PrestationCreateDto): Observable<ApiResponse<Prestation>> {
    return this.http.post<ApiResponse<Prestation>>(this.getUrl(slugSalon, '/prestations'), request);
  }

  getPrestation(slugSalon: string, id: number): Observable<ApiResponse<Prestation>> {
    return this.http.get<ApiResponse<Prestation>>(this.getUrl(slugSalon, `/prestations/${id}`));
  }

  listerPrestations(slugSalon: string, statut?: string): Observable<ApiResponse<Prestation[]>> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http.get<ApiResponse<Prestation[]>>(this.getUrl(slugSalon, '/prestations'), { params });
  }

  terminerPrestation(slugSalon: string, id: number): Observable<ApiResponse<Prestation>> {
    return this.http.put<ApiResponse<Prestation>>(this.getUrl(slugSalon, `/prestations/${id}/terminer`), {});
  }

  demarrerPrestation(slugSalon: string, id: number, coiffeurAffectationId?: number): Observable<ApiResponse<Prestation>> {
    let params = new HttpParams();
    if (coiffeurAffectationId) {
      params = params.set('coiffeurAffectationId', coiffeurAffectationId.toString());
    }
    return this.http.put<ApiResponse<Prestation>>(this.getUrl(slugSalon, `/prestations/${id}/demarrer`), {}, { params });
  }

  permuterCoiffeurRendezVous(slugSalon: string, id: number, nouveauCoiffeurAffectationId: number): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('nouveauCoiffeurAffectationId', nouveauCoiffeurAffectationId.toString());
    return this.http.put<ApiResponse<any>>(this.getUrl(slugSalon, `/rendez-vous/${id}/permuter`), {}, { params });
  }

  notifierRetardClient(slugSalon: string, id: number, message: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(this.getUrl(slugSalon, `/rendez-vous/${id}/notifier-retard`), { message });
  }

  pointerArriveeRendezVous(slugSalon: string, id: number): Observable<ApiResponse<Prestation>> {
    return this.http.post<ApiResponse<Prestation>>(this.getUrl(slugSalon, `/rendez-vous/${id}/pointer-arrivee`), {});
  }

  annulerPrestation(slugSalon: string, id: number, motif?: string): Observable<ApiResponse<Prestation>> {
    let params = new HttpParams();
    if (motif) {
      params = params.set('motif', motif);
    }
    return this.http.put<ApiResponse<Prestation>>(this.getUrl(slugSalon, `/prestations/${id}/annuler`), {}, { params });
  }

  // --- FACTURATION & ENCAISSEMENT ---

  listerFactures(slugSalon: string, statut?: string): Observable<ApiResponse<Facture[]>> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http.get<ApiResponse<Facture[]>>(this.getUrl(slugSalon, '/factures'), { params });
  }

  getFacture(slugSalon: string, factureId: number): Observable<ApiResponse<Facture>> {
    return this.http.get<ApiResponse<Facture>>(this.getUrl(slugSalon, `/factures/${factureId}`));
  }

  rechercherFactureParNumero(slugSalon: string, numero: string): Observable<ApiResponse<Facture>> {
    const params = new HttpParams().set('numero', numero);
    return this.http.get<ApiResponse<Facture>>(this.getUrl(slugSalon, '/factures/recherche'), { params });
  }

  encaisserPaiement(slugSalon: string, factureId: number, request: PaiementRecepteurDto): Observable<ApiResponse<Paiement>> {
    const payload = {
      montant: request.montant,
      type: request.type || 'SOLDE',
      moyenPaiement: request.moyenPaiement || request.modePaiement || 'ESPECES',
      modePaiement: request.modePaiement || 'ESPECES',
      motif: request.motif || 'Paiement prestation',
      reference: request.referencePaiement || request.reference || ''
    };
    return this.http.post<ApiResponse<Paiement>>(this.getUrl(slugSalon, `/factures/${factureId}/paiements`), payload);
  }

  effectuerRemboursement(slugSalon: string, paiementId: number, request: RemboursementRecepteurDto): Observable<ApiResponse<Paiement>> {
    return this.http.post<ApiResponse<Paiement>>(this.getUrl(slugSalon, `/paiements/${paiementId}/remboursement`), request);
  }

  appliquerRemise(slugSalon: string, factureId: number, request: RemiseFactureDto): Observable<ApiResponse<Facture>> {
    return this.http.patch<ApiResponse<Facture>>(this.getUrl(slugSalon, `/factures/${factureId}/remise`), request);
  }

  // --- CAISSE DU SALON ---

  ouvrirSessionCaisse(slugSalon: string, request: SessionCaisseOuvertureRecepteurDto): Observable<ApiResponse<SessionCaisse>> {
    return this.http.post<ApiResponse<SessionCaisse>>(this.getUrl(slugSalon, '/caisse/sessions'), request);
  }

  cloturerSessionCaisse(slugSalon: string, request: SessionCaisseClotureRecepteurDto): Observable<ApiResponse<SessionCaisse>> {
    return this.http.put<ApiResponse<SessionCaisse>>(this.getUrl(slugSalon, '/caisse/sessions/courante/cloturer'), request);
  }

  getSessionCourante(slugSalon: string): Observable<ApiResponse<SessionCaisse>> {
    return this.http.get<ApiResponse<SessionCaisse>>(this.getUrl(slugSalon, '/caisse/sessions/courante'));
  }
}
