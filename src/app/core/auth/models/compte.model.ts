export interface CompteSummary {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  rolePlateforme?: string;
}

export interface UserSession {
  compte: CompteSummary;
  slugSalon?: string;
  rolesSalon?: string[];
}
