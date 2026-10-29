import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { Realisation, ProfilCoiffeur } from '../../../../shared/models';
import { MatIconModule } from '@angular/material/icon';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { Tilt3dDirective } from '../../interactions/tilt-3d.directive';
import { RevealOnScrollDirective } from '../../interactions/reveal-on-scroll.directive';
import { HlsVideoDirective } from '../../../../shared/directives/hls-video.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-salon-realisations-grid',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    Tilt3dDirective,
    RevealOnScrollDirective,
    HlsVideoDirective
  ],
  templateUrl: './salon-realisations-grid.component.html',
  styleUrl: './salon-realisations-grid.component.css'
})
export class SalonRealisationsGridComponent implements OnInit {
  private readonly vitrineService = inject(VitrineService);
  private readonly route = inject(ActivatedRoute);
  readonly contextStore = inject(SalonContextStore);

  readonly realisations = signal<Realisation[]>([]);
  readonly coiffeurs = signal<ProfilCoiffeur[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly selectedCoiffeur = signal<string>('ALL');
  readonly searchQuery = signal<string>('');

  get slugSalon(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const s = r.snapshot.paramMap.get('slugSalon');
      if (s) return s;
      r = r.parent;
    }
    return this.contextStore.currentSlug();
  }

  get salonNom(): string {
    return this.contextStore.salon()?.nom || 'Notre Salon';
  }

  async ngOnInit(): Promise<void> {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const slug = this.slugSalon;
    if (slug) {
      await this.chargerDonnees(slug);
    }
    this.route.parent?.paramMap.subscribe((params) => {
      const parentSlug = params.get('slugSalon') || this.slugSalon;
      if (parentSlug && this.realisations().length === 0) {
        this.chargerDonnees(parentSlug);
      }
    });
  }

  private async chargerDonnees(slug: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const [reals, coiffs] = await Promise.all([
        firstValueFrom(this.vitrineService.getRealisations(slug)).catch(() => [] as Realisation[]),
        firstValueFrom(this.vitrineService.getCoiffeurs(slug)).catch(() => [] as ProfilCoiffeur[])
      ]);
      this.realisations.set(reals || []);
      this.coiffeurs.set(coiffs || []);
    } catch {
      this.realisations.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  readonly filteredRealisations = computed<Realisation[]>(() => {
    const list = this.realisations();
    const cFilter = this.selectedCoiffeur();
    const q = this.searchQuery().toLowerCase().trim();

    return list.filter((r) => {
      // Filtrer impérativement les réalisations ayant une vidéo valide
      const hasVideo = !!r.urlVideo && r.urlVideo.trim().length > 5;
      if (!hasVideo) return false;

      const matchCoiffeur =
        cFilter === 'ALL' ||
        (r.coiffeurNomComplet && r.coiffeurNomComplet.toLowerCase() === cFilter.toLowerCase()) ||
        r.coiffeurId?.toString() === cFilter;

      const matchQuery =
        !q ||
        r.titre.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.coiffeurNomComplet && r.coiffeurNomComplet.toLowerCase().includes(q));

      return matchCoiffeur && matchQuery;
    });
  });

  readonly availableStylists = computed<string[]>(() => {
    const set = new Set<string>();
    this.realisations().forEach((r) => {
      if (r.coiffeurNomComplet) {
        set.add(r.coiffeurNomComplet);
      }
    });
    this.coiffeurs().forEach((c) => {
      const nom = c.nomAffichage || `${c.coiffeurPrenom || ''} ${c.coiffeurNom || ''}`.trim();
      if (nom) {
        set.add(nom);
      }
    });
    return Array.from(set);
  });

  getViewCount(r: Realisation): string {
    const val = r?.totalVues || 0;
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1).replace('.0', '') + 'k';
    return val.toString();
  }

  getLikeCount(r: Realisation): string {
    const val = r?.totalLikes || 0;
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1).replace('.0', '') + 'k';
    return val.toString();
  }

  playPreview(video: HTMLVideoElement): void {
    video.play().catch(() => {});
  }

  pausePreview(video: HTMLVideoElement): void {
    video.pause();
    video.currentTime = 0;
  }
}
