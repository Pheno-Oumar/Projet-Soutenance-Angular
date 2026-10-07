export interface ReglePlateforme {
  id: number;
  titre: string;
  description: string;
  actif: boolean;
  dateCreation: string;
  dateModification?: string;
}

export interface ReglePlateformeCreateDto {
  titre: string;
  description: string;
}

export interface ReglePlateformeUpdateDto {
  titre?: string;
  description?: string;
}

export interface RegleSalon {
  id: number;
  titre: string;
  description: string;
  salonSlug: string;
  salonNom?: string;
  dateCreation: string;
  dateModification?: string;
}

export interface RegleSalonCreateDto {
  titre: string;
  description: string;
}

export interface RegleSalonUpdateDto {
  titre?: string;
  description?: string;
}
