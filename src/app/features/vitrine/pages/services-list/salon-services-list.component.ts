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
import { firstValueFrom } from 'rxjs';

interface CategorieDef {
  key: string;
  label: string;
  icon: string;
  keywords: string[];
}

export interface CategorieChip {
  key: string;
  label: string;
  icon: string;
  count: number;
}

/**
 * Familles de prestations reconnues à partir du nom / de la description des services.
 * Une famille n'est affichée que si au moins un service réel du salon lui appartient.
 */
const CATEGORIES_DEF: CategorieDef[] = [
  {
    key: 'coupe',
    label: 'Coupes & Coiffage',
    icon: 'content_cut',
    keywords: ['coupe', 'brushing', 'coiffage', 'barbe', 'rasage', 'dégradé', 'degrade', 'lissage', 'mise en plis', 'chignon']
  },
  {
    key: 'soin',
    label: 'Soins & Traitements',
    icon: 'spa',
    keywords: ['soin', 'traitement', 'kératine', 'keratine', 'botox', 'shampoing', 'masque', 'hydrat', 'protéine', 'proteine', 'cure']
  },
  {
    key: 'couleur',
    label: 'Coloration & Mèches',
    icon: 'palette',
    keywords: ['colo', 'mèche', 'meche', 'balayage', 'patine', 'décoloration', 'decoloration', 'ombré', 'ombre', 'teinture']
  },
  {
    key: 'tresse',
    label: 'Tresses & Nattes',
    icon: 'gesture',
    keywords: ['tresse', 'natte', 'vanille', 'locks', 'braids', 'twist', 'crochet', 'tissage', 'perruque', 'pose']
  }
];

const CATEGORIE_AUTRES: CategorieChip = {
  key: 'autres',
  label: 'Autres prestations',
  icon: 'auto_awesome',
  count: 0
};

@Component({
  selector: 'app-salon-services-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule, SafeMediaUrlPipe],
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
    } else {
      this.isLoading.set(false);
    }
  }

  /** Services actifs possédant au moins une formule active. */
  readonly activeServices = computed<PrestationCatalogue[]>(() =>
    this.services().filter(
      (s) => s.statut && s.variantes && s.variantes.some((v) => v.statut !== false)
    )
  );

  /** Détermine la famille d'un service à partir de son nom puis de sa description. */
  private categoryKeyOf(s: PrestationCatalogue): string {
    const nom = (s.nom || '').toLowerCase();
    const full = `${nom} ${(s.description || '').toLowerCase()}`;
    for (const cat of CATEGORIES_DEF) {
      if (cat.keywords.some((kw) => nom.includes(kw))) return cat.key;
    }
    for (const cat of CATEGORIES_DEF) {
      if (cat.keywords.some((kw) => full.includes(kw))) return cat.key;
    }
    return CATEGORIE_AUTRES.key;
  }

  /** Puces de catégories : uniquement celles qui contiennent de vrais services. */
  readonly categories = computed<CategorieChip[]>(() => {
    const list = this.activeServices();
    const counts = new Map<string, number>();
    for (const s of list) {
      const k = this.categoryKeyOf(s);
      counts.set(k, (counts.get(k) || 0) + 1);
    }

    const chips: CategorieChip[] = [];
    for (const def of CATEGORIES_DEF) {
      const count = counts.get(def.key) || 0;
      if (count > 0) chips.push({ key: def.key, label: def.label, icon: def.icon, count });
    }
    const autres = counts.get(CATEGORIE_AUTRES.key) || 0;
    if (autres > 0) chips.push({ ...CATEGORIE_AUTRES, count: autres });

    // Une seule famille : inutile d'afficher des filtres
    if (chips.length <= 1) return [];
    return [{ key: 'TOUS', label: 'Tous', icon: 'apps', count: list.length }, ...chips];
  });

  readonly filteredServices = computed<PrestationCatalogue[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    let list = this.activeServices();

    if (cat !== 'TOUS') {
      list = list.filter((s) => this.categoryKeyOf(s) === cat);
    }

    if (!q) return list;

    return list.filter(
      (s) =>
        s.nom.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  });

  selectCategory(key: string, event?: Event): void {
    this.selectedCategory.set(key);
    const el = event?.currentTarget as HTMLElement | null;
    // Recentre la puce choisie dans la barre défilable (mobile)
    el?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('TOUS');
  }

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

  /** Nombre de formules de ce service déjà ajoutées au rendez-vous. */
  getSelectedCount(s: PrestationCatalogue): number {
    return (s.variantes || []).filter((v) => this.bookingStore.isVarianteSelected(v.id)).length;
  }
}
