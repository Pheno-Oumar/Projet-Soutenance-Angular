export type StatutReclamation = 'EN_ATTENTE' | 'EN_COURS' | 'RESOLUE' | 'REJETEE';

export interface Reclamation {
  id: number;
  objet: string;
  description: string;
  statut: StatutReclamation;
  reponseTraitement?: string;
  dateCreation: string;
  dateTraitement?: string;
  clientNomComplet?: string;
  clientEmail?: string;
  traiteParNomComplet?: string;
  salonSlug?: string;
}

export interface ReclamationTraiterDto {
  nouveauStatut: StatutReclamation;
  reponse: string;
}
