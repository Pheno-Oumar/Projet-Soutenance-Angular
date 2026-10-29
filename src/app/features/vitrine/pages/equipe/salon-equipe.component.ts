import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { SalonBookingStore } from '../../state/salon-booking.store';
import { ProfilCoiffeur } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-salon-equipe',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, SafeMediaUrlPipe],
  templateUrl: './salon-equipe.component.html',
  styleUrl: './salon-equipe.component.css'
})
export class SalonEquipeComponent implements OnInit {
  private readonly vitrineService = inject(VitrineService);
  readonly contextStore = inject(SalonContextStore);
  readonly bookingStore = inject(SalonBookingStore);

  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly isLoading = signal<boolean>(true);

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  async ngOnInit(): Promise<void> {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const slug = this.slugSalon;
    if (slug) {
      try {
        const list = await firstValueFrom(this.vitrineService.getCoiffeurs(slug));
        this.coiffeurs.set(list || []);
      } catch (e) {
        this.coiffeurs.set([]);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  choisirCoiffeur(c: ProfilCoiffeur): void {
    const nomComplet = `${c.coiffeurPrenom} ${c.coiffeurNom}`;
    this.bookingStore.setCoiffeur(c.id, nomComplet);
    this.bookingStore.openDrawer();
  }
}
