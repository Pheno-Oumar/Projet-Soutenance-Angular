export type TypeActionAudit =
  | 'CONNEXION'
  | 'DECONNEXION'
  | 'CREATION'
  | 'MODIFICATION'
  | 'DESACTIVATION'
  | 'REACTIVATION'
  | 'CHANGEMENT_MDP'
  | 'SUPPRESSION';

export interface AuditLog {
  id: number;
  dateHeure: string;
  action: TypeActionAudit;
  entite: string;
  entiteId?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  adresseIP?: string;
  userAgent?: string;
  roleUtilise?: string;
  compteId?: number;
  compteEmail?: string;
  compteNom?: string;
  salonSlug?: string;
  salonNom?: string;
}

export interface AuditFilterDto {
  action?: TypeActionAudit;
  entite?: string;
  dateDebut?: string;
  dateFin?: string;
}
