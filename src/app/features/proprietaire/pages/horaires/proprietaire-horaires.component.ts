import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HoraireSalon } from '../../../../shared/models';

interface HoraireLigne {
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
  { key: 'LUNDI', label: 'Lundi' },
  { key: 'MARDI', label: 'Mardi' },
  { key: 'MERCREDI', label: 'Mercredi' },
  { key: 'JEUDI', label: 'Jeudi' },
  { key: 'VENDREDI', label: 'Vendredi' },
  { key: 'SAMEDI', label: 'Samedi' },
  { key: 'DIMANCHE', label: 'Dimanche' }
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
  readonly errorMessage = signal<string | null>(null);

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

    // S'assurer du format HH:mm:ss
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
        this.notificationService.success(`L'horaire du ${ligne.label} a été mis à jour.`, 'Horaire enregistré');
      },
      error: (err) => {
        ligne.isSaving = false;
        this.notificationService.error(err?.error?.message || `Impossible d'enregistrer l'horaire du ${ligne.label}.`, 'Erreur');
      }
    });
  }

  enregistrerTout(): void {
    this.horaires().forEach(ligne => this.enregistrerJour(ligne));
  }
}
