import { PlanningRendezVousDto } from './rendezvous.models';
import { RetardRendezVous } from './facture.models';
import { Prestation } from './prestation.models';

export interface ReceptionnisteStatsJour {
  totalRendezVousJour: number;
  rdvEnAttente: number;
  prestationsEnCours: number;
  prestationsTerminees: number;
  clientsEnRetardCount: number;
  noShowsCount: number;
}

export interface ReceptionnisteCaisseStatut {
  caisseOuverte: boolean;
  sessionCaisseId?: number;
  dateOuvertureSession?: string;
  soldeOuverture: number;
  totalEncaisseJour: number;
  nombreOperationsJour: number;
}

export interface ReceptionnisteDashboard {
  stats: ReceptionnisteStatsJour;
  caisse: ReceptionnisteCaisseStatut;
  prochainsRendezVous: PlanningRendezVousDto[];
  retardsActuels: RetardRendezVous[];
  prestationsEnCours: Prestation[];
}

export interface LignePrestationCreateDto {
  varianteServiceId: number;
  prixReel: number;
  varianteId?: number;
  ordre?: number;
}

export interface PrestationCreateDto {
  rendezVousId?: number;
  coiffeurAffectationId?: number;
  clientCompteId?: number;
  nomClient?: string;
  prenomClient?: string;
  telephoneClient?: string;
  statut?: 'EN_ATTENTE' | 'EN_COURS' | string;
  lignes: LignePrestationCreateDto[];
}

export interface ReceptionnisteRDVCreateDto {
  coiffeurAffectationId?: number;
  coiffeurId?: number;
  nomClient: string;
  prenomClient: string;
  telephoneClient: string;
  clientEmail?: string;
  dateHeureDebut?: string;
  dateHeurePrevue?: string;
  varianteIds: number[];
  commentaire?: string;
}

export interface PaiementRecepteurDto {
  montant: number;
  type?: 'SOLDE' | 'ACOMPTE' | string;
  modePaiement: 'ESPECES' | 'WAVE' | 'ORANGE_MONEY' | 'CARTE_BANCAIRE';
  moyenPaiement?: string;
  referencePaiement?: string;
  reference?: string;
  motif?: string;
}

export interface RemboursementRecepteurDto {
  montant: number;
  motif: string;
  annulerPrestation?: boolean;
}

export interface SessionCaisseOuvertureRecepteurDto {
  soldeOuverture: number;
  notes?: string;
}

export interface SessionCaisseClotureRecepteurDto {
  soldeFermeture: number;
  notes?: string;
}
