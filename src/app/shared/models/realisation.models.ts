export interface Realisation {
  id: number;
  titre: string;
  description?: string;
  urlVideo: string;
  dateRealisation?: string;
  datePublication?: string;
  statutPublication: boolean;
  salonSlug: string;
  salonNom?: string;
  coiffeurId: number;
  coiffeurNomComplet?: string;
  totalLikes?: number;
  totalCommentaires?: number;
  totalVues?: number;
  dateCreation: string;
  dateModification?: string;
}

export interface RealisationCreateDto {
  titre: string;
  description?: string;
  coiffeurId?: number;
  dateRealisation?: string;
  publierImmediatement?: boolean;
}

export interface RealisationUpdateDto {
  titre: string;
  description?: string;
  coiffeurId?: number;
  dateRealisation?: string;
}

export interface RealisationPublicationDto {
  statutPublication: boolean;
}

export interface AvisPrestation {
  id: number;
  lignePrestationId: number;
  prestationId: number;
  serviceNom: string;
  varianteNom?: string;
  coiffeurId: number;
  coiffeurNomComplet?: string;
  clientId: number;
  clientNomComplet?: string;
  note: number;
  commentaire?: string;
  statut: boolean;
  dateCreation: string;
  dateModification?: string;
}

export interface AvisSalon {
  id: number;
  salonSlug: string;
  clientId: number;
  clientNomComplet?: string;
  note: number;
  commentaire?: string;
  statut: boolean;
  dateCreation: string;
}
