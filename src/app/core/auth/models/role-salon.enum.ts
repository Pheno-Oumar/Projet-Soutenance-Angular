export enum TypeRoleSalon {
  PROPRIETAIRE = 'PROPRIETAIRE',
  MANAGER = 'MANAGER',
  COIFFEUR = 'COIFFEUR',
  RECEPTIONNISTE = 'RECEPTIONNISTE',
  RESPONSABLE_STOCK = 'RESPONSABLE_STOCK',
  COMPTABLE = 'COMPTABLE',
  CLIENT = 'CLIENT'
}

export enum TypeRolePlateforme {
  ADMIN_SYSTEME = 'ADMIN_SYSTEME'
}

export type UserRole = TypeRoleSalon | TypeRolePlateforme;
