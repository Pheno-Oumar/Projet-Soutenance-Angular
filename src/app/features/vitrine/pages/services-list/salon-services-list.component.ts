import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { SalonBookingStore } from '../../state/salon-booking.store';
import { PrestationCatalogue } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { Tilt3dDirective } from '../../interactions/tilt-3d.directive';
import { RevealOnScrollDirective } from '../../interactions/reveal-on-scroll.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-salon-services-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    SafeMediaUrlPipe,
    Tilt3dDirective,
    RevealOnScrollDirective
  ],
  templateUrl: './salon-services-list.component.html',
  styleUrl: './salon-services-list.component.css'
})
export class SalonServicesListComponent implements OnInit {
  private readonly vitrineService = inject(VitrineService);
  readonly contextStore = inject(SalonContextStore);
  readonly bookingStore = inject(SalonBookingStore);

  readonly services = signal<PrestationCatalogue[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('TOUS');

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  get salonNom(): string {
    return this.contextStore.salon()?.nom || 'Notre Salon';
  }

  async ngOnInit(): Promise<void> {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const slug = this.slugSalon;
    if (slug) {
      try {
        const list = await firstValueFrom(this.vitrineService.getServices(slug));
        this.services.set(list || []);
      } catch {
        this.services.set([]);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  // Catégories déduites automatiquement selon les mots-clés des prestations
  readonly categories = computed<string[]>(() => {
    const defaultCats = ['TOUS', 'Coupes & Brushing', 'Soins & Traitements', 'Coloration & Mèches', 'Tresses & Nattes'];
    return defaultCats;
  });

  readonly filteredServices = computed<PrestationCatalogue[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    // Exiger que le service soit actif et contienne au moins une variante active
    let list = this.services().filter(
      (s) => s.statut && s.variantes && s.variantes.some((v) => v.statut !== false)
    );

    if (cat !== 'TOUS') {
      const catKeywords: Record<string, string[]> = {
        'Coupes & Brushing': ['coupe', 'brushing', 'coiffage', 'barbe'],
        'Soins & Traitements': ['soin', 'traitement', 'kératine', 'botox', 'shampoing', 'masque'],
        'Coloration & Mèches': ['coloration', 'mèche', 'balayage', 'patine', 'décoloration'],
        'Tresses & Nattes': ['tresse', 'natte', 'vanille', 'locks', 'braids', 'twist']
      };

      const keywords = catKeywords[cat] || [];
      if (keywords.length > 0) {
        list = list.filter((s) => {
          const text = `${s.nom} ${s.description || ''}`.toLowerCase();
          return keywords.some((kw) => text.includes(kw));
        });
      }
    }

    if (!q) return list;

    return list.filter(
      (s) =>
        s.nom.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  });

  getMinPrice(s: PrestationCatalogue): number {
    const active = s.variantes?.filter((v) => v.statut !== false) || [];
    if (active.length > 0) {
      return Math.min(...active.map((v) => v.prix));
    }
    return 0;
  }

  getMinDuree(s: PrestationCatalogue): number {
    const active = s.variantes?.filter((v) => v.statut !== false) || [];
    if (active.length > 0) {
      return Math.min(...active.map((v) => v.dureeMinutes));
    }
    return 30;
  }

  getFormulesCount(s: PrestationCatalogue): number {
    const active = s.variantes?.filter((v) => v.statut !== false) || [];
    return active.length;
  }
}
