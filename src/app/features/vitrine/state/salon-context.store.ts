import { Injectable, inject, signal, computed } from '@angular/core';
import { VitrineService } from '../../../core/services/vitrine.service';
import { Salon, HoraireOuverture } from '../../../shared/models';
import { firstValueFrom } from 'rxjs';

export interface SalonOuvertureStatus {
  isOpen: boolean;
  message: string;
  horaireAujourdhui?: HoraireOuverture;
}

@Injectable({ providedIn: 'root' })
export class SalonContextStore {
  private readonly vitrineService = inject(VitrineService);

  readonly salon = signal<Salon | null>(null);
  readonly horaires = signal<HoraireOuverture[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly currentSlug = signal<string>('');

  /**
   * Statut d'ouverture dynamique calculé en temps réel
   */
  readonly ouvertureStatus = computed<SalonOuvertureStatus>(() => {
    const list = this.horaires();
    if (!list || list.length === 0) {
      return { isOpen: true, message: 'Ouvert · Sur rendez-vous' };
    }

    const joursMap = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
    const now = new Date();
    const jourActuel = joursMap[now.getDay()];
    const horaireAujourdhui = list.find((h) => h.jourSemaine?.toUpperCase() === jourActuel);

    if (!horaireAujourdhui || horaireAujourdhui.actif === false) {
      return { isOpen: false, message: 'Fermé aujourd’hui', horaireAujourdhui };
    }

    const formatTime = (timeStr?: string) => {
      if (!timeStr) return '';
      return timeStr.substring(0, 5);
    };

    const currentTimeMin = now.getHours() * 60 + now.getMinutes();

    const parseToMin = (t?: string) => {
      if (!t) return 0;
      const parts = t.split(':').map((p) => parseInt(p, 10));
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    };

    const openMin = parseToMin(horaireAujourdhui.heureOuverture);
    const closeMin = parseToMin(horaireAujourdhui.heureFermeture);

    if (currentTimeMin >= openMin && currentTimeMin < closeMin) {
      return {
        isOpen: true,
        message: `Ouvert · Ferme à ${formatTime(horaireAujourdhui.heureFermeture)}`,
        horaireAujourdhui
      };
    } else if (currentTimeMin < openMin) {
      return {
        isOpen: false,
        message: `Fermé · Ouvre à ${formatTime(horaireAujourdhui.heureOuverture)}`,
        horaireAujourdhui
      };
    } else {
      return {
        isOpen: false,
        message: 'Fermé actuellement',
        horaireAujourdhui
      };
    }
  });

  /**
   * Initialise le salon si le slug change ou s'il n'est pas encore chargé
   */
  async loadSalon(slug: string, forceReload = false): Promise<void> {
    if (!slug) return;
    if (!forceReload && this.currentSlug() === slug && this.salon()) {
      return; // Déjà en cache
    }

    this.currentSlug.set(slug);
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [salonData, horairesData] = await Promise.all([
        firstValueFrom(this.vitrineService.getInfosSalon(slug)),
        firstValueFrom(this.vitrineService.getHoraires(slug)).catch(() => [] as HoraireOuverture[])
      ]);

      this.salon.set(salonData);
      this.horaires.set(horairesData || []);
    } catch (err: any) {
      this.error.set(err?.message || 'Erreur lors du chargement du salon');
      this.salon.set(null);
      this.horaires.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
