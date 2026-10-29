export interface FavoriSalon {
  id: number;
  salonSlug: string;
  salonNom: string;
  salonLogoUrl?: string;
  clientId: number;
  dateAjout: string;
}

export interface FavoriCoiffeur {
  id: number;
  coiffeurId: number;
  coiffeurNomComplet: string;
  coiffeurPhotoUrl?: string;
  salonSlug: string;
  salonNom: string;
  clientId: number;
  dateAjout: string;
}
