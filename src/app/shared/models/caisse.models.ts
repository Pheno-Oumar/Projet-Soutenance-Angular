export interface SessionCaisse {
  id: number;
  affectationId?: number;
  comptableNom?: string;
  comptablePrenom?: string;
  comptableEmail?: string;
  dateOuverture: string;
  dateCloture?: string;
  soldeOuverture: number;
  soldeFermeture?: number;
  totalEntrees: number;
  totalSorties: number;
  soldeTheorique?: number;
  statut: string; // OUVERTE, CLOTUREE
  operations?: OperationCaisse[];
}

export interface OuvertureCaisseDto {
  soldeOuverture: number;
}

export interface FermetureCaisseDto {
  soldeFermeture: number;
}

export interface MouvementCaisseDto {
  montant: number;
  type: string; // ENTREE, SORTIE
  motif: string;
}

export type TypeMouvementCaisse = 'ENTREE' | 'SORTIE';
export type TypePaiement = 'ESPECES' | 'CARTE_BANCAIRE' | 'ORANGE_MONEY' | 'WAVE';

export interface OperationCaisse {
  id: number;
  sessionId: number;
  type: TypeMouvementCaisse;
  montant: number;
  motif?: string;
  dateOperation: string;
  auteurNom: string;
}

export interface PaiementCreateDto {
  factureId: number;
  montant: number;
  type: TypePaiement;
}

export interface Paiement {
  id: number;
  numeroPaiement: string;
  factureId: number;
  numeroFacture?: string;
  montant: number;
  datePaiement: string;
  type: TypePaiement;
  statut: string;
  moyenPaiement?: string;
  reference?: string;
  paiementOrigineId?: number;
  paiementOrigineNumero?: string;
  montantRembourse?: number;
  montantRemboursable?: number;
}
