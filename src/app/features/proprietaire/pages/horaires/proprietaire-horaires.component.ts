import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HoraireSalon } from '../../../../shared/models';

export interface HoraireLigne {
  jourSemaine: string;
  label: string;
  heureOuverture: string;
  heureFermeture: string;
  pauseDebut: string;
  pauseFin: string;
  actif: boolean;
  isSaving?: boolean;
}

const JOURS_SEMAINE = [
  { key: 'LUNDI', label: 'Lundi', court: 'LUN' },
  { key: 'MARDI', label: 'Mardi', court: 'MAR' },
  { key: 'MERCREDI', label: 'Mercredi', court: 'MER' },
  { key: 'JEUDI', label: 'Jeudi', court: 'JEU' },
  { key: 'VENDREDI', label: 'Vendredi', court: 'VEN' },
  { key: 'SAMEDI', label: 'Samedi', court: 'SAM' },
  { key: 'DIMANCHE', label: 'Dimanche', court: 'DIM' }
];

@Component({
  selector: 'app-proprietaire-horaires',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-horaires.component.html',
  styleUrl: './proprietaire-horaires.component.css'
})
export class ProprietaireHorairesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly notificationService = inject(NotificationService);

  readonly horaires = signal<HoraireLigne[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSavingAll = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly joursActifsCount = computed(() => {
    return this.horaires().filter(h => h.actif).length;
  });

  readonly heuresHebdo = computed(() => {
    let totalMinutes = 0;
    for (const h of this.horaires()) {
      if (h.actif && h.heureOuverture && h.heureFermeture) {
        const [oH, oM] = h.heureOuverture.split(':').map(Number);
        const [fH, fM] = h.heureFermeture.split(':').map(Number);
        let openMins = (fH * 60 + (fM || 0)) - (oH * 60 + (oM || 0));
        if (h.pauseDebut && h.pauseFin) {
          const [pdH, pdM] = h.pauseDebut.split(':').map(Number);
          const [pfH, pfM] = h.pauseFin.split(':').map(Number);
          const pauseMins = (pfH * 60 + (pfM || 0)) - (pdH * 60 + (pdM || 0));
          if (pauseMins > 0) openMins -= pauseMins;
        }
        if (openMins > 0) totalMinutes += openMins;
      }
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${hours}h`;
  });

  ngOnInit(): void {
    this.initialiserHorairesParDefaut();
    this.chargerHoraires();
  }

  get slugSalon(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const slug = r.snapshot.paramMap.get('slugSalon');
      if (slug) return slug;
      r = r.parent;
    }
    return '';
  }

  private initialiserHorairesParDefaut(): void {
    const defaultLines: HoraireLigne[] = JOURS_SEMAINE.map(j => ({
      jourSemaine: j.key,
      label: j.label,
      heureOuverture: '09:00',
      heureFermeture: '19:00',
      pauseDebut: '',
      pauseFin: '',
      actif: j.key !== 'DIMANCHE',
      isSaving: false
    }));
    this.horaires.set(defaultLines);
  }

  chargerHoraires(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.proprietaireService.listerHoraires(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data && res.data.length > 0) {
          const map = new Map<string, HoraireSalon>();
          res.data.forEach(h => map.set(h.jourSemaine.toUpperCase(), h));

          const merged: HoraireLigne[] = JOURS_SEMAINE.map(j => {
            const h = map.get(j.key);
            if (h) {
              return {
                jourSemaine: j.key,
                label: j.label,
                heureOuverture: (h.heureOuverture || '09:00').substring(0, 5),
                heureFermeture: (h.heureFermeture || '19:00').substring(0, 5),
                pauseDebut: h.pauseDebut ? h.pauseDebut.substring(0, 5) : '',
                pauseFin: h.pauseFin ? h.pauseFin.substring(0, 5) : '',
                actif: h.actif !== false,
                isSaving: false
              };
            }
            return {
              jourSemaine: j.key,
              label: j.label,
              heureOuverture: '09:00',
              heureFermeture: '19:00',
              pauseDebut: '',
              pauseFin: '',
              actif: j.key !== 'DIMANCHE',
              isSaving: false
            };
          });

          this.horaires.set(merged);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors de la récupération des horaires.');
      }
    });
  }

  enregistrerJour(ligne: HoraireLigne): void {
    const slug = this.slugSalon;
    if (!slug) return;

    ligne.isSaving = true;
    const formatTime = (t: string) => (t && t.length === 5 ? `${t}:00` : t);

    const dto: HoraireSalon = {
      jourSemaine: ligne.jourSemaine,
      heureOuverture: formatTime(ligne.heureOuverture),
      heureFermeture: formatTime(ligne.heureFermeture),
      pauseDebut: ligne.pauseDebut ? formatTime(ligne.pauseDebut) : undefined,
      pauseFin: ligne.pauseFin ? formatTime(ligne.pauseFin) : undefined,
      actif: ligne.actif
    };

    this.proprietaireService.definirHoraire(slug, dto).subscribe({
      next: () => {
        ligne.isSaving = false;
        this.notificationService.success(`L'horaire du ${ligne.label} a été mis à jour avec succès.`, 'Horaire actualisé');
      },
      error: (err) => {
        ligne.isSaving = false;
        this.notificationService.error(err?.error?.message || `Impossible d'enregistrer l'horaire du ${ligne.label}.`, 'Erreur');
      }
    });
  }

  enregistrerTout(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isSavingAll.set(true);
    const formatTime = (t: string) => (t && t.length === 5 ? `${t}:00` : t);

    const requests = this.horaires().map(ligne => {
      const dto: HoraireSalon = {
        jourSemaine: ligne.jourSemaine,
        heureOuverture: formatTime(ligne.heureOuverture),
        heureFermeture: formatTime(ligne.heureFermeture),
        pauseDebut: ligne.pauseDebut ? formatTime(ligne.pauseDebut) : undefined,
        pauseFin: ligne.pauseFin ? formatTime(ligne.pauseFin) : undefined,
        actif: ligne.actif
      };
      return this.proprietaireService.definirHoraire(slug, dto);
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.isSavingAll.set(false);
        this.notificationService.success('Tous les horaires hebdomadaires ont été synchronisés et enregistrés avec succès.', 'Semaine Actualisée');
      },
      error: (err) => {
        this.isSavingAll.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors de la sauvegarde globale des horaires.');
      }
    });
  }

  dupliquerVersTous(source: HoraireLigne): void {
    const updated = this.horaires().map(h => {
      if (h.jourSemaine === source.jourSemaine) return h;
      return {
        ...h,
        heureOuverture: source.heureOuverture,
        heureFermeture: source.heureFermeture,
        pauseDebut: source.pauseDebut,
        pauseFin: source.pauseFin,
        actif: h.jourSemaine !== 'DIMANCHE' ? source.actif : h.actif
      };
    });
    this.horaires.set(updated);
    this.notificationService.info(`Horaires de ${source.label} appliqués aux autres jours. N'oubliez pas d'enregistrer.`);
  }

  appliquerPresetStandard(): void {
    const updated = this.horaires().map(h => ({
      ...h,
      heureOuverture: '09:00',
      heureFermeture: '19:00',
      pauseDebut: '13:00',
      pauseFin: '14:00',
      actif: h.jourSemaine !== 'DIMANCHE'
    }));
    this.horaires.set(updated);
    this.notificationService.info('Modèle classique (09h-19h avec pause repas) chargé. Pensez à enregistrer.');
  }

  appliquerPresetContinu(): void {
    const updated = this.horaires().map(h => ({
      ...h,
      heureOuverture: '08:30',
      heureFermeture: '20:00',
      pauseDebut: '',
      pauseFin: '',
      actif: h.jourSemaine !== 'DIMANCHE'
    }));
    this.horaires.set(updated);
    this.notificationService.info('Modèle journée continue (08h30-20h sans pause) chargé. Pensez à enregistrer.');
  }
}
