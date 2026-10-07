export interface Salon {
  id: number;
  nom: string;
  slug: string;
  logoUrl?: string;
  coverUrl?: string;
  ville?: string;
  statut: boolean;
  dateCreation?: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  latitude?: number;
  longitude?: number;
  nombreClients?: number;
  nombreEmployes?: number;
  chiffreAffaires?: number;
  nombreCommandes?: number;
}

export interface SalonCreateDto {
  nom: string;
  emailProprietaire: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
}

export interface SalonUpdateDto {
  nom: string;
  description?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
}

export interface SalonUpdateNomDto {
  nouveauNom: string;
}

export interface FermetureExceptionnelle {
  id: number;
  dateDebut: string;
  dateFin: string;
  motif?: string;
  dateCreation: string;
}

export interface FermetureExceptionnelleCreateDto {
  dateDebut: string;
  dateFin: string;
  motif?: string;
}

export interface FermetureExceptionnelleUpdateDto {
  dateDebut: string;
  dateFin: string;
  motif?: string;
}

export interface ProprietaireCreateDto {
  nom: string;
  prenom: string;
  dateNaissance: string;
  telephone: string;
  email: string;
  nomSalon: string;
}

export interface HoraireSalon {
  id?: number;
  jourSemaine: string; // LUNDI, MARDI, etc.
  heureOuverture: string;
  heureFermeture: string;
  pauseDebut?: string;
  pauseFin?: string;
  actif?: boolean;
  estFerme?: boolean;
}

export interface Employe {
  affectationId: number;
  compteId: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: boolean;
  roles: string[];
}

export interface EmployeCreateDto {
  nom: string;
  prenom: string;
  dateNaissance?: string;
  telephone: string;
  email: string;
  roles: string[];
}

export interface EmployeRoleUpdateDto {
  roles: string[];
}

export interface TransfertProprieteDto {
  nouvelEmailProprietaire: string;
  motDePasseConfirmation: string;
}

export interface ClientRapideCreateDto {
  nom: string;
  prenom: string;
  dateNaissance?: string;
  telephone: string;
  email: string;
}

export interface ClientRapide {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  dateNaissance?: string;
}
