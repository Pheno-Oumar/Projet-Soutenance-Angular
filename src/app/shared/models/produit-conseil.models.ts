export type EtapeRoutine = 'LAVAGE' | 'SOIN_PROFOND' | 'HYDRATATION' | 'FINITION';

export type CuirChevelu = 'NORMAL' | 'SEC' | 'GRAS' | 'SENSIBLE' | 'PELLICULES';

export type EtatCheveux =
  | 'SAIN'
  | 'SEC'
  | 'ABIME'
  | 'CASSE'
  | 'COLORE'
  | 'DEFRISE'
  | 'TRANSITION';

export type PorositeCheveux = 'FAIBLE' | 'MOYENNE' | 'FORTE';

export type TextureCheveux = 'FINS' | 'MOYENS' | 'EPAIS';

export type TypeCheveux = 'LISSES' | 'ONDULES' | 'BOUCLES' | 'FRISES' | 'CREPUS';

export interface ProduitConseil {
  id: number;
  nom: string;
  marque?: string;
  description?: string;
  modeUtilisation?: string;
  imageUrl?: string;
  etapeRoutine: EtapeRoutine;
  cuirsChevelusCibles: CuirChevelu[];
  etatsCheveuxCibles: EtatCheveux[];
  porositesCibles: PorositeCheveux[];
  typesCheveuxCibles: TypeCheveux[];
  texturesCibles: TextureCheveux[];
  alternativeNaturelleNom?: string;
  alternativeNaturelleIngredients?: string;
  alternativeNaturelleRecette?: string;
  actif: boolean;
  dateCreation?: string;
  dateModification?: string;
}

export interface ProduitConseilDto {
  nom: string;
  marque?: string;
  description?: string;
  modeUtilisation?: string;
  imageUrl?: string;
  etapeRoutine: EtapeRoutine;
  cuirsChevelusCibles?: CuirChevelu[];
  etatsCheveuxCibles?: EtatCheveux[];
  porositesCibles?: PorositeCheveux[];
  typesCheveuxCibles?: TypeCheveux[];
  texturesCibles?: TextureCheveux[];
  alternativeNaturelleNom?: string;
  alternativeNaturelleIngredients?: string;
  alternativeNaturelleRecette?: string;
  actif?: boolean;
}

export interface ProduitConseilStats {
  total: number;
  actifs: number;
  inactifs: number;
  parEtape: Record<EtapeRoutine, number>;
}

export const ETAPE_ROUTINE_CONFIG: Record<
  EtapeRoutine,
  { label: string; description: string; badgeClass: string }
> = {
  LAVAGE: {
    label: 'Lavage',
    description: 'Shampoings doux, clarifiants & exfoliants',
    badgeClass: 'badge-lavage'
  },
  SOIN_PROFOND: {
    label: 'Soin Profond',
    description: 'Masques restructurants, bains d’huiles & protéines',
    badgeClass: 'badge-soin'
  },
  HYDRATATION: {
    label: 'Hydratation',
    description: 'Leave-in, laits capillaires & crèmes hydratantes',
    badgeClass: 'badge-hydratation'
  },
  FINITION: {
    label: 'Finition & Scellage',
    description: 'Sérums de brillance, huiles végétales & gelées fixantes',
    badgeClass: 'badge-finition'
  }
};

export const TYPE_CHEVEUX_OPTIONS: { value: TypeCheveux; label: string }[] = [
  { value: 'LISSES', label: 'Lisses (Type 1)' },
  { value: 'ONDULES', label: 'Ondulés (Type 2)' },
  { value: 'BOUCLES', label: 'Bouclés (Type 3)' },
  { value: 'FRISES', label: 'Frisés (Type 3C/4A)' },
  { value: 'CREPUS', label: 'Crépus (Type 4B/4C)' }
];

export const POROSITE_OPTIONS: { value: PorositeCheveux; label: string }[] = [
  { value: 'FAIBLE', label: 'Porosité Faible' },
  { value: 'MOYENNE', label: 'Porosité Moyenne' },
  { value: 'FORTE', label: 'Porosité Forte' }
];

export const TEXTURE_OPTIONS: { value: TextureCheveux; label: string }[] = [
  { value: 'FINS', label: 'Fins' },
  { value: 'MOYENS', label: 'Moyens' },
  { value: 'EPAIS', label: 'Épais' }
];

export const ETAT_CHEVEUX_OPTIONS: { value: EtatCheveux; label: string }[] = [
  { value: 'SAIN', label: 'Sains' },
  { value: 'SEC', label: 'Secs' },
  { value: 'ABIME', label: 'Abîmés' },
  { value: 'CASSE', label: 'Cassants' },
  { value: 'COLORE', label: 'Colorés' },
  { value: 'DEFRISE', label: 'Défrisés' },
  { value: 'TRANSITION', label: 'En transition' }
];

export const CUIR_CHEVELU_OPTIONS: { value: CuirChevelu; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'SEC', label: 'Sec' },
  { value: 'GRAS', label: 'Gras' },
  { value: 'SENSIBLE', label: 'Sensible' },
  { value: 'PELLICULES', label: 'Pellicules' }
];
