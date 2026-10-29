export interface ProfilCoiffeur {
  id: number;
  affectationId: number;
  coiffeurNom: string;
  coiffeurPrenom: string;
  nomAffichage?: string;
  biographie?: string;
  anneeExperience?: number;
  photoProfilUrl?: string;
  description?: string;
}

export interface ProfilCoiffeurDto {
  nomAffichage?: string;
  biographie?: string;
  anneeExperience?: number;
  photoProfilUrl?: string;
  description?: string;
}

export interface Indisponibilite {
  id: number;
  coiffeurAffectationId: number;
  dateDebut: string;
  dateFin: string;
  motif?: string;
  commentaire?: string;
  dateCreation: string;
}

export interface IndisponibiliteDto {
  coiffeurAffectationId?: number;
  dateDebut: string;
  dateFin: string;
  motif: string;
  commentaire?: string;
}

export interface CodeProfilVerificationDto {
  codeProfil: string;
}

export interface PerformanceCoiffeur {
  coiffeurId: number;
  nom: string;
  prenom: string;
  email: string;
  nombrePrestations: number;
  chiffreAffaires: number;
}

export interface CoiffeurDashboard {
  affectationId: number;
  nomAffichage?: string;
  biographie?: string;
  anneeExperience?: number;
  photoProfilUrl?: string;
  rdvAujourdhuiTotal: number;
  rdvAujourdhuiTermines: number;
  rdvAujourdhuiEnAttente: number;
  prestationsMoisTerminees: number;
  noteMoyenne: number;
  totalAvis: number;
  planningAujourdhui: any[];
  prochainesIndisponibilites: Indisponibilite[];
}
