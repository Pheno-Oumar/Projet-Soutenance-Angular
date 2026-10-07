export interface Compte {
  id: number;
  nom: string;
  prenom: string;
  dateNaissance: string;
  telephone: string;
  email: string;
  statut: boolean;
  rolePlateforme?: string;
  dateCreation?: string;
}

export interface CompteUpdateDto {
  nom: string;
  prenom: string;
  dateNaissance: string;
  telephone: string;
}

export interface ChangementMotDePasseDto {
  ancienMotDePasse: string;
  nouveauMotDePasse: string;
}
