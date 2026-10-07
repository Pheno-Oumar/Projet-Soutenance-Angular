import { CategorieDepense } from './depense.models';
import { TypePaiement } from './caisse.models';

export type TypeRapportFinancier =
  | 'ENTREES_SORTIES'
  | 'TOUTES_DEPENSES'
  | 'DEPENSES_CATEGORIE'
  | 'TOUTES_ENTREES'
  | 'ENTREE_SPECIFIQUE';

export type FormatExportDonnees = 'PDF' | 'CSV' | 'JSON';

export interface LigneRapportEntree {
  paiementId?: number;
  numeroPaiement?: string;
  numeroFacture?: string;
  montant: number;
  modePaiement: TypePaiement;
  datePaiement: string;
  clientNom?: string;
  statut?: string;
}

export interface LigneRapportSortie {
  depenseId?: number;
  montant: number;
  categorie: CategorieDepense;
  dateDepense: string;
  description?: string;
  comptableNom?: string;
  statut: boolean;
}

export interface RapportFinancier {
  slugSalon: string;
  dateDebut?: string;
  dateFin?: string;
  typeRapport: TypeRapportFinancier;
  categorieDepense?: CategorieDepense;
  totalEntrees: number;
  totalSorties: number;
  soldeNet: number;
  nombreEntrees: number;
  nombreSorties: number;
  entrees?: LigneRapportEntree[];
  sorties?: LigneRapportSortie[];
}

export interface RapportFinancierFiltreDto {
  dateDebut?: string;
  dateFin?: string;
  typeRapport: TypeRapportFinancier;
  categorieDepense?: CategorieDepense;
  typePaiement?: TypePaiement;
  format?: FormatExportDonnees;
}

export interface RapportExport {
  exportId: number;
  slugSalon: string;
  format: FormatExportDonnees;
  urlTelechargement: string;
  dateDemande: string;
  dateExpiration: string;
  statut: string;
}

export interface KpiFinancier {
  slugSalon: string;
  chiffreAffairesTotal: number;
  revenusMoisEnCours: number;
  depensesMoisEnCours: number;
  beneficeNetMoisEnCours: number;
  revenusAujourdhui: number;
  depensesAujourdhui: number;
  beneficeNetAujourdhui: number;
  totalRemboursements: number;
  depensesParCategorie: Record<string, number>;
  sessionCaisseOuverte: boolean;
  soldeTheoriqueCaisseActive: number;
}
