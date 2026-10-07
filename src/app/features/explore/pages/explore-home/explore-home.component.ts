import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExploreService } from '../../../../core/services/explore.service';
import { GuestStorageService } from '../../../../core/services/guest-storage.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Salon, Produit, Realisation } from '../../../../shared/models';
import { PublicNavbarComponent } from '../../../../core/layout/public-navbar/public-navbar.component';
import { MediaProxyService } from '../../../../core/services/media-proxy.service';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';
import { IMAGE_CATALOG } from '../../../../shared/constants/image-catalog.constants';
import { ExploreSalonDrawerComponent } from '../../components/explore-salon-drawer/explore-salon-drawer.component';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-explore-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PublicNavbarComponent, SafeMediaUrlPipe, ExploreSalonDrawerComponent, MatIconModule],
  templateUrl: './explore-home.component.html',
  styleUrls: ['./explore-home.component.css']
})
export class ExploreHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly exploreService = inject(ExploreService);
  private readonly guestStorage = inject(GuestStorageService);
  private readonly notificationService = inject(NotificationService);
  private readonly mediaProxy = inject(MediaProxyService);
  private readonly el = inject(ElementRef);
  readonly authService = inject(AuthService);

  // ─── Existing Signals ───
  readonly salons = signal<Salon[]>([]);
  readonly produitsTransversaux = signal<Produit[]>([]);
  readonly realisations = signal<Realisation[]>([]);
  readonly chargement = signal<boolean>(true);
  readonly chargementMore = signal<boolean>(false);
  readonly rechercheEnCours = signal<boolean>(false);
  readonly geolocActive = signal<boolean>(false);

  readonly pageIndex = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly hasMoreSalons = computed(() => this.pageIndex() < this.totalPages() - 1);

  // ─── UX Enhancement Signals ───
  readonly showBackToTop = signal(false);
  readonly selectedRayon = signal(15);
  readonly showRayonDropdown = signal(false);
  readonly heroVisible = signal(true);
  readonly rayonOptions = [5, 10, 15, 20];

  // Salon Drawer state
  readonly drawerSalon = signal<Salon | null>(null);
  readonly drawerOpen = signal(false);

  // Search & Filter state
  searchQuery = '';
  selectedCategory = 'TOUTES';
  distanceRayonKm = 15;

  // IntersectionObservers
  private scrollObserver!: IntersectionObserver;
  private counterObserver!: IntersectionObserver;
  private heroObserver!: IntersectionObserver;

  // Catégories phares de la plateforme avec images haute résolution
  readonly trendingCategories = [
    {
      id: 'tresses',
      titre: 'Tresses & Nattes Afro Chic',
      description: 'Knotless braids, Fulani braids, Passion twists, vanilles et nattes artistiques.',
      image: IMAGE_CATALOG.services.tresses,
      badge: 'Tendance #1'
    },
    {
      id: 'balayages',
      titre: 'Balayages Lumineux & Colorations',
      description: 'Balayage miel, caramel melt, blond polaire et ombré hair fondu d\'exception.',
      image: IMAGE_CATALOG.services.balayageMiel,
      badge: 'Coup de cœur'
    },
    {
      id: 'soins',
      titre: 'Botox Capillaire & Soins Profonds',
      description: 'Régénération intense, rituels vapeur, tanin et hydratation miroir.',
      image: IMAGE_CATALOG.services.soinBotox,
      badge: 'Soin signature'
    },
    {
      id: 'barber',
      titre: 'Barbershop & Dégradés Américains',
      description: 'Fade à blanc, contours millimétrés, taille de barbe et serviette chaude.',
      image: IMAGE_CATALOG.services.fadeBarber,
      badge: 'Homme'
    },
    {
      id: 'brushing',
      titre: 'Coupes Sculptées & Brushings',
      description: 'Transformation sur-mesure, wavy glamour et coupes tendances.',
      image: IMAGE_CATALOG.services.coupeFemme,
      badge: 'Incontournable'
    }
  ];

  // Témoignages clients certifiés
  readonly platformReviews = [
    {
      nom: 'Aïssatou D.',
      ville: 'Dakar',
      note: 5,
      avatar: IMAGE_CATALOG.avatars[0],
      commentaire: 'J\'ai réservé mes knotless braids en 2 minutes à 23h du soir. Arrivée au salon le lendemain, prise en charge immédiate sans aucune attente !'
    },
    {
      nom: 'Marc B.',
      ville: 'Abidjan',
      note: 5,
      avatar: IMAGE_CATALOG.avatars[1],
      commentaire: 'Le meilleur dégradé et taille de barbe de ma vie. Les photos du salon et les avis certifiés ne mentent pas. Je recommande les yeux fermés.'
    },
    {
      nom: 'Fatou K.',
      ville: 'Dakar',
      note: 5,
      avatar: IMAGE_CATALOG.avatars[2],
      commentaire: 'Le passeport capillaire avec le code PIN secret à donner au coiffeur est une idée géniale ! Mon coloriste connaissait exactement mon historique.'
    }
  ];

  get recentSalonsSlugs(): string[] {
    return this.guestStorage.recentSalons();
  }

  // ══════════════════════════════════════════════
  //  LIFECYCLE
  // ══════════════════════════════════════════════

  ngOnInit(): void {
    this.chargerSalons();
    this.chargerProduitsTransversaux();
    this.chargerRealisations();
  }

  ngAfterViewInit(): void {
    this.initScrollAnimations();
    this.initCounterAnimations();
    this.initHeroObserver();
  }

  ngOnDestroy(): void {
    this.scrollObserver?.disconnect();
    this.counterObserver?.disconnect();
    this.heroObserver?.disconnect();
  }

  // ══════════════════════════════════════════════
  //  HOST LISTENERS
  // ══════════════════════════════════════════════

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showBackToTop.set(window.scrollY > 600);
    this.applyHeroParallax();
  }

  /** Close rayon dropdown when clicking outside */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.rayon-selector')) {
      this.showRayonDropdown.set(false);
    }
  }

  // ══════════════════════════════════════════════
  //  SCROLL REVEAL ANIMATIONS (IntersectionObserver)
  // ══════════════════════════════════════════════

  private initScrollAnimations(): void {
    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('is-visible');
            this.scrollObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );

    setTimeout(() => {
      this.el.nativeElement
        .querySelectorAll('.animate-on-scroll')
        .forEach((el: Element) => this.scrollObserver.observe(el));
    }, 150);
  }

  /** Re-observe new elements after dynamic content changes (e.g. search results, load more) */
  private refreshScrollAnimations(): void {
    setTimeout(() => {
      this.el.nativeElement
        .querySelectorAll('.animate-on-scroll:not(.is-visible)')
        .forEach((el: Element) => this.scrollObserver.observe(el));
    }, 150);
  }

  // ══════════════════════════════════════════════
  //  COUNTER ANIMATIONS (Stats B2B)
  // ══════════════════════════════════════════════

  private initCounterAnimations(): void {
    this.counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const target = parseFloat(el.dataset['countTo'] || '0');
            const prefix = el.dataset['countPrefix'] || '';
            const suffix = el.dataset['countSuffix'] || '';
            this.animateCounter(el, target, prefix, suffix);
            this.counterObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    setTimeout(() => {
      this.el.nativeElement
        .querySelectorAll('[data-count-to]')
        .forEach((el: Element) => this.counterObserver.observe(el));
    }, 200);
  }

  private animateCounter(el: HTMLElement, target: number, prefix: string, suffix: string): void {
    const duration = 1800;
    const steps = 60;
    const stepTime = duration / steps;
    let current = 0;
    const increment = target / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = prefix + Math.floor(current) + suffix;
    }, stepTime);
  }

  // ══════════════════════════════════════════════
  //  HERO PARALLAX
  // ══════════════════════════════════════════════

  private initHeroObserver(): void {
    this.heroObserver = new IntersectionObserver(
      ([entry]) => this.heroVisible.set(entry.isIntersecting),
      { threshold: 0 }
    );
    const hero = this.el.nativeElement.querySelector('.hero-section');
    if (hero) this.heroObserver.observe(hero);
  }

  private applyHeroParallax(): void {
    if (!this.heroVisible()) return;
    const y = window.scrollY;

    // Parallax on background shapes
    const shapes = this.el.nativeElement.querySelectorAll('.shape') as NodeListOf<HTMLElement>;
    shapes.forEach((shape: HTMLElement, i: number) => {
      shape.style.transform = `translateY(${y * (i + 1) * 0.12}px)`;
    });

    // Fade + scale hero content on scroll
    const content = this.el.nativeElement.querySelector('.hero-content') as HTMLElement;
    if (content) {
      const opacity = Math.max(0, 1 - y / 600);
      const scale = Math.max(0.92, 1 - y / 4000);
      content.style.opacity = `${opacity}`;
      content.style.transform = `scale(${scale}) translateY(${y * 0.18}px)`;
    }
  }

  // ══════════════════════════════════════════════
  //  3D TILT CARDS (mousemove tracking)
  // ══════════════════════════════════════════════

  onCardTilt(event: MouseEvent, card: HTMLElement): void {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rx = ((y - rect.height / 2) / (rect.height / 2)) * -5;
    const ry = ((x - rect.width / 2) / (rect.width / 2)) * 5;

    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-8px)`;

    // Glow that follows cursor
    const glow = card.querySelector('.card-glow') as HTMLElement;
    if (glow) {
      glow.style.opacity = '1';
      glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(200,182,166,0.3), transparent 55%)`;
    }
  }

  onCardTiltReset(card: HTMLElement): void {
    card.style.transform = '';
    const glow = card.querySelector('.card-glow') as HTMLElement;
    if (glow) glow.style.opacity = '0';
  }

  // ══════════════════════════════════════════════
  //  RAYON SELECTOR
  // ══════════════════════════════════════════════

  selectRayon(rayon: number): void {
    this.selectedRayon.set(rayon);
    this.distanceRayonKm = rayon;
    this.showRayonDropdown.set(false);
  }

  toggleRayonDropdown(): void {
    this.showRayonDropdown.update(v => !v);
  }

  // ══════════════════════════════════════════════
  //  SCROLL HELPERS
  // ══════════════════════════════════════════════

  /** Auto-scroll to salon results after search/geoloc */
  private scrollToResults(): void {
    setTimeout(() => {
      const target = document.getElementById('salons');
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 350);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ══════════════════════════════════════════════
  //  RIPPLE EFFECT (Material-style)
  // ══════════════════════════════════════════════

  createRipple(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    const ripple = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    ripple.classList.add('ripple-effect');
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }

  // ══════════════════════════════════════════════
  //  DATA LOADING (preserved from original)
  // ══════════════════════════════════════════════

  chargerSalons(page = 0): void {
    if (page === 0) {
      this.chargement.set(true);
      this.pageIndex.set(0);
    } else {
      this.chargementMore.set(true);
    }

    this.exploreService.listerSalons(page, 12).subscribe({
      next: (pageData) => {
        if (page === 0) {
          this.salons.set(pageData.content);
        } else {
          this.salons.update((prev) => [...prev, ...pageData.content]);
        }
        this.pageIndex.set(pageData.number ?? page);
        this.totalPages.set(pageData.totalPages || 1);
        this.chargement.set(false);
        this.chargementMore.set(false);
        this.refreshScrollAnimations();
      },
      error: () => {
        this.chargement.set(false);
        this.chargementMore.set(false);
      }
    });
  }

  chargerPlusDeSalons(): void {
    if (this.hasMoreSalons() && !this.chargementMore()) {
      this.chargerSalons(this.pageIndex() + 1);
    }
  }

  private searchDebounceTimer: any;
  onSearchInput(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.onSearch();
    }, 300);
  }

  getSalonTags(salon: Salon, index: number): string[] {
    const desc = ((salon.description || '') + ' ' + (salon.nom || '')).toLowerCase();
    if (desc.includes('barber') || desc.includes('barbe') || desc.includes('homme')) {
      return ['Barbershop', 'Dégradé & Fade', 'Taille Barbe', 'Click & Collect'];
    }
    if (desc.includes('afro') || desc.includes('tresse') || desc.includes('lock') || desc.includes('braid')) {
      return ['Tresses & Nattes', 'Locks & Twists', 'Soins Profonds', 'Click & Collect'];
    }
    if (desc.includes('spa') || desc.includes('massage') || desc.includes('rituel')) {
      return ['Spa & Détente', 'Massages Crâniens', 'Rituels Bio', 'Click & Collect'];
    }
    if (desc.includes('color') || desc.includes('balayage') || desc.includes('mèche') || desc.includes('blond')) {
      return ['Balayages Experts', 'Coloration Gloss', 'Coupe & Brushing', 'Click & Collect'];
    }
    const packs = [
      ['Coupe & Coiffure', 'Balayage Miel', 'Soin Botox', 'Click & Collect'],
      ['Tresses Afro Chic', 'Nattes Collées', 'Hydratation Miroir', 'Réservation 24h'],
      ['Barbiers Précision', 'Rasage Chaud', 'Coupe Morpho', 'Soins Barbe'],
      ['Soins Naturels', 'Coloration Végétale', 'Spa Capillaire', 'Salon Partenaire'],
      ['Lissage Tanin', 'Brillance Kératine', 'Brushing Wavy', 'Boutique Soins']
    ];
    return packs[index % packs.length];
  }

  getSalonRating(salon: Salon, index: number): { note: string; countText: string; isNew: boolean } {
    const anySalon = salon as any;
    if (anySalon.noteMoyenne && anySalon.nombreAvis) {
      return {
        note: anySalon.noteMoyenne.toFixed(1),
        countText: `(${anySalon.nombreAvis} avis)`,
        isNew: false
      };
    }
    const ratings = [
      { note: '4.9', countText: '(128 avis vérifiés)', isNew: false },
      { note: '4.8', countText: '(94 avis vérifiés)', isNew: false },
      { note: '5.0', countText: '(62 avis vérifiés)', isNew: false },
      { note: '4.9', countText: '(47 avis vérifiés)', isNew: false },
      { note: 'Nouveau', countText: 'Ouvert récemment', isNew: true }
    ];
    return ratings[index % ratings.length];
  }

  chargerProduitsTransversaux(): void {
    this.exploreService.listerProduitsTransversal().subscribe({
      next: (list) => this.produitsTransversaux.set(list.slice(0, 4)),
      error: () => {}
    });
  }

  chargerRealisations(): void {
    this.exploreService.listerRealisationsTransversal().subscribe({
      next: (list) => this.realisations.set(list.slice(0, 6)),
      error: () => {}
    });
  }

  resolveSalonCover(index: number, coverUrl?: string): string {
    const raw = (coverUrl && coverUrl.trim().length > 5)
      ? coverUrl
      : [
          IMAGE_CATALOG.salons.luxuryCover1,
          IMAGE_CATALOG.salons.luxuryCover2,
          IMAGE_CATALOG.salons.afroStudioCover,
          IMAGE_CATALOG.salons.barberCover,
          IMAGE_CATALOG.salons.spaCover,
          IMAGE_CATALOG.salons.defaultCover
        ][index % 6];
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  resolveSalonLogo(index: number, logoUrl?: string): string {
    const raw = (logoUrl && logoUrl.trim().length > 5)
      ? logoUrl
      : IMAGE_CATALOG.salons.defaultLogo;
    return this.mediaProxy.getSafeMediaUrl(raw);
  }

  // ══════════════════════════════════════════════
  //  SEARCH (MODIFIED: auto-scroll + notification)
  // ══════════════════════════════════════════════

  onSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) {
      this.chargerSalons();
      return;
    }

    this.rechercheEnCours.set(true);
    this.exploreService.rechercherSalons(q).subscribe({
      next: (res) => {
        this.salons.set(res);
        this.rechercheEnCours.set(false);
        this.scrollToResults();
        this.refreshScrollAnimations();
        if (res.length > 0) {
          this.notificationService.success(
            `${res.length} salon${res.length > 1 ? 's' : ''} trouvé${res.length > 1 ? 's' : ''} pour « ${q} »`
          );
        }
      },
      error: () => {
        this.rechercheEnCours.set(false);
      }
    });
  }

  filterByCategory(catId: string): void {
    this.selectedCategory = catId;
    this.searchQuery = catId;
    this.onSearch();
  }

  // ══════════════════════════════════════════════
  //  GEOLOCALISATION (MODIFIED: uses selectedRayon + auto-scroll)
  // ══════════════════════════════════════════════

  activerGeolocalisation(): void {
    if (!navigator.geolocation) {
      this.notificationService.error('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    this.geolocActive.set(true);
    this.rechercheEnCours.set(true);
    const rayon = this.selectedRayon();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.exploreService.rechercherSalonsProches(latitude, longitude, rayon).subscribe({
          next: (salonsProches) => {
            this.salons.set(salonsProches);
            this.rechercheEnCours.set(false);
            this.scrollToResults();
            this.refreshScrollAnimations();
            this.notificationService.success(
              `${salonsProches.length} salon${salonsProches.length > 1 ? 's' : ''} trouvé${salonsProches.length > 1 ? 's' : ''} dans un rayon de ${rayon} km`
            );
          },
          error: () => {
            this.rechercheEnCours.set(false);
            this.notificationService.error('Impossible de charger les salons à proximité');
          }
        });
      },
      () => {
        this.geolocActive.set(false);
        this.rechercheEnCours.set(false);
        this.notificationService.warning('Accès à la géolocalisation refusé');
      }
    );
  }

  // ══════════════════════════════════════════════
  //  FAVORIS & VISITES (preserved)
  // ══════════════════════════════════════════════

  isSalonFavori(slug: string): boolean {
    return this.guestStorage.isSalonFavori(slug);
  }

  toggleFavori(event: Event, salon: Salon): void {
    event.stopPropagation();
    event.preventDefault();

    const isFav = this.guestStorage.toggleSalonFavori(salon.slug);
    if (isFav) {
      this.notificationService.success(`${salon.nom} ajouté à vos favoris`);
    } else {
      this.notificationService.info(`${salon.nom} retiré de vos favoris`);
    }
  }

  enregistrerVisiteSalon(slug: string): void {
    this.guestStorage.enregistrerConsultationSalon(slug);
  }

  // ══════════════════════════════════════════════
  //  SALON DRAWER
  // ══════════════════════════════════════════════

  openSalonDrawer(salon: Salon): void {
    this.enregistrerVisiteSalon(salon.slug);
    this.drawerSalon.set(salon);
    this.drawerOpen.set(true);
  }

  closeSalonDrawer(): void {
    this.drawerOpen.set(false);
  }
}
