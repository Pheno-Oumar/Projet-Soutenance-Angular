export type StatutDemandeSuppression = 'EN_ATTENTE' | 'APPROUVEE' | 'REJETEE';

export interface DemandeSuppression {
  id: number;
  compteId: number;
  compteEmail: string;
  motif?: string;
  statut: StatutDemandeSuppression;
  dateDemande: string;
  dateDecision?: string;
  motifDecision?: string;
  traiteParAdminEmail?: string;
}

export interface DemandeSuppressionDecisionDto {
  approuvee: boolean;
  motifDecision?: string;
}
