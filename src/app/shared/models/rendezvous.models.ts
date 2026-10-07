export interface CreneauDisponible {
  heureDebut: string;
  heureFin: string;
  coiffeurId: number;
  coiffeurNom: string;
}

export interface DisponibiliteSearchDto {
  date: string;
  varianteIds: number[];
  serviceIds?: number[];
  coiffeurId?: number;
  heureMinimale?: string;
}

export interface RendezVousCreateDto {
  dateHeurePrevue: string;
  dateHeure?: string;
  varianteIds: number[];
  serviceIds?: number[];
  coiffeurId?: number;
  notes?: string;
  clientId?: number;
}

export interface VitrineRendezVousCreateDto {
  dateHeurePrevue: string;
  varianteIds: number[];
  coiffeurId?: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  password?: string;
  notes?: string;
}

export interface RendezVousSansRdvDto {
  clientId: number;
  serviceIds: number[];
  coiffeurId?: number;
  notes?: string;
}

export interface RendezVousDeplacerDto {
  nouvelleDateHeure: string;
}

export interface RendezVousAnnulationDto {
  motif: string;
}

export interface RendezVous {
  id: number;
  clientNom: string;
  clientEmail: string;
  dateHeure: string;
  statut: string; // PLANIFIE, CONFIRME, EN_COURS, TERMINE, ANNULE, NO_SHOW
  typeRdv: string; // AVEC_RENDEZ_VOUS, SANS_RENDEZ_VOUS
  notes?: string;
  services: string[];
  coiffeurNom?: string;
}

export interface LigneRendezVousDto {
  id: number;
  varianteId: number;
  varianteNom: string;
  dateHeureDebut: string;
  dateHeureFin: string;
  duree: number;
  prix: number;
  ordre: number;
}

export interface PlanningRendezVousDto {
  rdvId: number;
  id?: number;
  coiffeurAffectationId: number;
  coiffeurNom: string;
  coiffeurPrenom: string;
  dateHeureDebut: string;
  dateHeurePrevue?: string;
  dateHeureFin: string;
  nomClient: string;
  prenomClient: string;
  clientNom?: string;
  clientPrenom?: string;
  telephoneClient: string;
  clientTelephone?: string;
  clientCompteId: number;
  statut: string;
  montantEstime: number;
  prestations: LigneRendezVousDto[];
}

