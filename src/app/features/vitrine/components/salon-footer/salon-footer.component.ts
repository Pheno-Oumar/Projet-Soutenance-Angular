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
  @Input() horaires: HoraireOuverture[] = [];

  currentYear = new Date().getFullYear();

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
}
