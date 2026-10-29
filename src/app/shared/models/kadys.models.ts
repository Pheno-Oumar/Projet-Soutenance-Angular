export type StatutCommentaire = 'ACTIF' | 'MASQUE' | 'SUPPRIME';

export interface KadysRealisation {
  id: number;
  titre: string;
  description?: string;
  urlVideo: string;
  imageUrl?: string;
  urlMedia?: string;
  dateRealisation?: string;
  datePublication?: string;
  salonSlug: string;
  salonNom: string;
  salonLogoUrl?: string;
  coiffeurId?: number;
  coiffeurNomComplet?: string;
  totalLikes: number;
  totalCommentaires: number;
  totalVues: number;
  isLikedByCurrentUser: boolean;
}

export interface CommentaireRealisation {
  id: number;
  realisationId: number;
  auteurId?: number;
  auteurNomComplet: string;
  auteurPhotoUrl?: string;
  contenu: string;
  statut: StatutCommentaire;
  dateCreation: string;
  isMine: boolean;
}

export interface CommentaireCreateDto {
  contenu: string;
}

export interface LikeToggleDto {
  liked: boolean;
  totalLikes: number;
}
