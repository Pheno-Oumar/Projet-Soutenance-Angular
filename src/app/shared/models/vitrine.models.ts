export interface VitrineDisponibiliteRequest {
  date: string;
  varianteIds: number[];
  heureMinimale?: string;
}

export interface ClientRegisterRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  password: string;
  dateNaissance?: string;
}

export interface HoraireOuverture {
  id?: number;
  jourSemaine: string; // 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI' | 'DIMANCHE'
  heureOuverture: string; // '09:00:00'
  heureFermeture: string; // '19:30:00'
  pauseDebut?: string;
  pauseFin?: string;
  actif?: boolean;
}
