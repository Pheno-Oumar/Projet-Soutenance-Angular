export interface StockProduit {
  id: number;
  quantiteDisponible: number;
  seuilMinimum: number;
  seuilMaximum?: number;
  alerte: boolean;
  dateDerniereMiseAJour?: string;
}

export interface Produit {
  id: number;
  nom: string;
  description?: string;
  prixVente: number;
  imageUrl?: string;
  statut: boolean;
  categorieId: number;
  categorieNom: string;
  stock?: StockProduit;
  dateCreation?: string;
  dateModification?: string;
}

export interface ProduitInitialDto {
  nom: string;
  description?: string;
  prixVente: number;
  quantiteInitiale: number;
  seuilMinimum: number;
  seuilMaximum?: number;
  prixAchatUnitaire?: number;
}

export interface CategorieProduit {
  id: number;
  nom: string;
  description?: string;
  imageUrl?: string;
  statut: boolean;
  nombreProduits?: number;
  produits: Produit[];
}

export interface CategorieProduitCreateDto {
  nom: string;
  description?: string;
  produits?: ProduitInitialDto[];
}

export interface CategorieProduitUpdateDto {
  nom: string;
  description?: string;
}

export interface ProduitCreateDto {
  nom: string;
  description?: string;
  prixVente: number;
  quantiteInitiale: number;
  seuilMinimum: number;
  seuilMaximum?: number;
  prixAchatUnitaire?: number;
}

export interface ProduitUpdateDto {
  nom: string;
  description?: string;
  prixVente: number;
  seuilMinimum: number;
  seuilMaximum?: number;
}

export interface MouvementStock {
  id: number;
  produitId: number;
  produitNom: string;
  quantite: number;
  type: string; // ENTREE, VENTE, PERTE, AJUSTEMENT
  prixUnitaire?: number;
  dateMouvement: string;
  motif?: string;
  auteurNom: string;
  quantiteRestante?: number;
}

export interface MouvementStockCreateDto {
  produitId: number;
  quantite: number;
  type: string;
  prixUnitaire?: number;
  motif?: string;
}

export interface ProduitAlerteStock {
  produitId: number;
  produitNom: string;
  categorieId: number;
  categorieNom: string;
  prixVente: number;
  quantiteDisponible: number;
  seuilMinimum: number;
  seuilMaximum?: number;
  estEnRuptureTotale: boolean;
}

export interface LignePanier {
  id: number;
  produitId: number;
  produitNom: string;
  prixUnitaire: number;
  quantite: number;
  sousTotal: number;
  stockDisponible: number;
  enAlerte: boolean;
}

export interface Panier {
  id: number;
  slugSalon: string;
  clientEmail: string;
  lignes: LignePanier[];
  montantTotal: number;
  nombreArticles: number;
  dateModification?: string;
}

export interface AjoutPanierDto {
  produitId: number;
  quantite: number;
}

export interface ModificationQuantiteDto {
  quantite: number;
}

export interface LigneCommande {
  id: number;
  produitId: number;
  produitNom: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export type StatutCommande = 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE' | 'RECUPEREE' | 'ANNULEE';

export interface Commande {
  id: number;
  numeroCommande: string;
  dateCommande: string;
  statut: StatutCommande;
  montantTotal: number;
  clientNom: string;
  clientEmail: string;
  codeRetrait?: string;
  motifRejet?: string;
  dateTraitement?: string;
  traiteParNom?: string;
  factureId?: number;
  numeroFacture?: string;
  lignes: LigneCommande[];
}

export interface RejetCommandeDto {
  motif: string;
}

export interface RetraitCommandeDto {
  codeRetrait: string;
}

export interface KpiStock {
  totalProduitsActifs: number;
  totalProduitsEnAlerte: number;
  totalProduitsEnRupture: number;
  valeurTotaleStock: number;
  totalCommandes: number;
  commandesEnAttente: number;
  commandesValidees: number;
  commandesRejetees: number;
  commandesRecuperees: number;
  chiffreAffairesVentes: number;
}

export interface StockSynthese {
  produitId: number;
  produitNom: string;
  categorieNom: string;
  prixVente: number;
  quantiteDisponible: number;
  seuilMinimum: number;
  seuilMaximum?: number;
  alerteStockBas: boolean;
}

export interface LigneVitrineCommandeRequest {
  produitId: number;
  quantite: number;
}

export interface VitrineCommandeRequest {
  nom: string;
  prenom?: string;
  telephone: string;
  email?: string;
  password?: string;
  lignes: LigneVitrineCommandeRequest[];
}

