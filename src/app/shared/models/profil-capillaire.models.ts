export interface ProfilCapillaire {
  id: number;
  compteId: number;
  nomClient: string;
  prenomClient: string;
  typeCheveux?: string;
  texture?: string;
  porosite?: string;
  longueur?: string;
  densite?: string;
  cuirChevelu?: string;
  etatCheveux?: string;
  hasCodeProfil: boolean;
  dateCreation?: string;
  dateMiseAJour?: string;
}

export interface ProfilCapillaireDto {
  typeCheveux?: string;
  texture?: string;
  porosite?: string;
  longueur?: string;
  densite?: string;
  cuirChevelu?: string;
  etatCheveux?: string;
}

export interface CodeProfilDto {
  codePin: string;
}
