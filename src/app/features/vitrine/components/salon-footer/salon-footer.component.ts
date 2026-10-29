import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Salon, HoraireOuverture } from '../../../../shared/models';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-salon-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeMediaUrlPipe, MatIconModule],
  templateUrl: './salon-footer.component.html',
  styleUrls: ['./salon-footer.component.css']
})
export class SalonFooterComponent {
  @Input() salon: Salon | null = null;
  @Input({ required: true }) slugSalon = '';
  @Input() set horaires(value: HoraireOuverture[] | null | undefined) {
    this.horairesTries = [...(value || [])].sort(
      (a, b) => this.ordreJour(a.jourSemaine) - this.ordreJour(b.jourSemaine)
    );
  }

  /** Horaires du salon, triés du lundi au dimanche (aucune valeur par défaut inventée). */
  horairesTries: HoraireOuverture[] = [];

  currentYear = new Date().getFullYear();

  private ordreJour(jour?: string): number {
    const ordre = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
    const idx = ordre.indexOf((jour || '').toUpperCase());
    return idx === -1 ? ordre.length : idx;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatHour(h?: string): string {
    if (!h) return '';
    return h.substring(0, 5);
  }

  getJourLabel(jour: string): string {
    const labels: Record<string, string> = {
      LUNDI: 'Lundi',
      MARDI: 'Mardi',
      MERCREDI: 'Mercredi',
      JEUDI: 'Jeudi',
      VENDREDI: 'Vendredi',
      SAMEDI: 'Samedi',
      DIMANCHE: 'Dimanche'
    };
    return labels[jour] || jour;
  }

  isToday(jour?: string): boolean {
    if (!jour) return false;
    const jours = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
    const currentDay = jours[new Date().getDay()];
    return jour.toUpperCase() === currentDay;
  }
}
