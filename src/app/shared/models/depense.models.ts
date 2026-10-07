export type CategorieDepense =
  | 'LOYER'
  | 'ELECTRICITE'
  | 'EAU'
  | 'INTERNET'
  | 'SALAIRE'
  | 'FOURNITURES'
  | 'ACHAT_STOCK'
  | 'ENTRETIEN'
  | 'REMBOURSEMENT'
  | 'TRANSPORT'
  | 'AUTRE';

export interface Depense {
  id: number;
  montant: number;
  dateDepense: string;
  description?: string;
  categorie: CategorieDepense;
  statut: boolean;
  salonSlug: string;
  comptableNomComplet?: string;
  operationCaisseId?: number;
  mouvementStockId?: number;
}

export interface DepenseCreateDto {
  montant: number;
  categorie: CategorieDepense;
  description?: string;
}
