import { Paiement } from './caisse.models';
import { RendezVous } from './rendezvous.models';
import { Prestation } from './prestation.models';
import { ProfilCapillaire } from './profil-capillaire.models';

export interface Facture {
  id: number;
  numeroFacture: string;
  dateEmission: string;
  montantTotal: number;
  remise?: number;
  motifRemise?: string;
  montantNet?: number;
  montantPaye: number;
  resteAPayer: number;
  prestationId?: number;
  commandeId?: number;
  paiements: Paiement[];
  clientNom?: string;
  clientTelephone?: string;
  coiffeurNom?: string;
  lignesPrestation?: any[];
  statut?: string;
}

export interface RemiseFactureDto {
  montant: number;
  motif: string;
}

export interface RemboursementDto {
  montant: number;
  motif: string;
  annulerPrestation?: boolean;
}

export interface ClientSalonResume {
  clientId: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  dateNaissance?: string;
  dateInscription: string;
  hasProfilCapillaire?: boolean;
}

export interface FicheClientComplete {
  clientId: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  dateNaissance?: string;
  profilCapillaire?: ProfilCapillaire;
  rendezVous: RendezVous[];
  prestations: Prestation[];
  factures: Facture[];
  paiements: Paiement[];
}

export interface FicheClientManager {
  clientId: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  dateNaissance?: string;
  profilCapillaire?: ProfilCapillaire;
  rendezVous: RendezVous[];
  prestations: Prestation[];
}

export interface PlanningRendezVous {
  rdvId: number;
  dateHeureDebut: string;
  dateHeureFin: string;
  nomClient: string;
  prenomClient: string;
  telephoneClient?: string;
  clientCompteId?: number;
  statut: string;
  type: string;
  montantEstime?: number;
  prestations: {
    serviceNom: string;
    varianteNom: string;
    coiffeurNom: string;
    dureeMinutes: number;
    prix: number;
  }[];
}

export interface RetardRendezVous {
  rdvId: number;
  clientNom: string;
  clientTelephone?: string;
  coiffeurNom: string;
  heurePrevue: string;
  minutesRetard: number;
  statut: string;
}

export interface RetardTraitementDto {
  action: 'DECALER' | 'NO_SHOW';
  minutesDecalage?: number;
  motif?: string;
}
