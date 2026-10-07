export interface VarianteServiceDto {
  id: number;
  nom: string;
  dureeMinutes: number;
  prix: number;
  imageUrl?: string;
  statut: boolean;
}

export interface VarianteCreateDto {
  nom: string;
  dureeMinutes: number;
  prix: number;
}

export interface VarianteUpdateDto {
  nom: string;
  dureeMinutes: number;
  prix: number;
}

export interface VariantePrixUpdateDto {
  nouveauPrix: number;
}

export interface ServiceSalonCreateDto {
  nom: string;
  description?: string;
  variantes?: VarianteCreateDto[];
}

export interface ServiceSalonUpdateDto {
  nom: string;
  description?: string;
}

export interface PrestationCatalogue {
  id: number;
  nom: string;
  description?: string;
  imageUrl?: string;
  statut: boolean;
  variantes?: VarianteServiceDto[];
  dateCreation?: string;
  // Propriétés de rétrocompatibilité pour affichage rapide si pas de variantes découpées
  dureeMinutes?: number;
  prix?: number;
}

export type ServiceSalonDto = PrestationCatalogue;

export interface PrestationCatalogueCreateDto {
  nom: string;
  description?: string;
  dureeMinutes?: number;
  prix?: number;
  variantes?: VarianteCreateDto[];
}

export interface LignePrestation {
  id: number;
  varianteServiceId?: number;
  varianteNom?: string;
  serviceNom?: string;
  prixReel?: number;
  prix?: number;
  coiffeurNom?: string;
}

export interface Prestation {
  id: number;
  salonSlug: string;
  coiffeurAffectationId?: number;
  coiffeurNom?: string;
  coiffeurPrenom?: string;
  clientCompteId?: number;
  nomClient?: string;
  prenomClient?: string;
  telephoneClient?: string;
  clientNom?: string;
  clientEmail?: string;
  rendezVousId?: number;
  rdvId?: number;
  dateHeureDebut?: string;
  dateHeureFin?: string;
  datePrestation?: string;
  statut: string;
  ordreFileAttente?: number;
  montantTotal: number;
  facture?: any;
  factureId?: number;
  lignes: LignePrestation[];
}
