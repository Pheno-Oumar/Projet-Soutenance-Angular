export interface KpiPlateforme {
  nombreSalonsTotal: number;
  nombreSalonsActifs: number;
  nombreSalonsInactifs: number;
  nombreComptesTotal: number;
  nombreComptesActifs: number;
  nombreComptesInactifs: number;
  nombreRendezVousTotal: number;
  nombrePrestationsTotal: number;
  nombrePrestationsTerminees: number;
  chiffreAffairesGlobal: number;
}

export interface KpiSalon {
  slugSalon: string;
  nomSalon: string;
  nombreClients: number;
  nombreCoiffeurs: number;
  nombreRendezVousTotal: number;
  nombreRendezVousTermines: number;
  nombreRendezVousAnnules: number;
  nombrePrestationsTotal: number;
  nombrePrestationsTerminees: number;
  totalRevenus: number;
  totalDepenses: number;
  beneficeNet: number;
}
