export interface ClientRegisterDto {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  password: string;
  dateNaissance?: string;
}

export interface SalonCheckDto {
  exists: boolean;
  id: number;
  nom: string;
  slug: string;
  statut: boolean;
  logoUrl?: string;
  telephone?: string;
  adresse?: string;
}
