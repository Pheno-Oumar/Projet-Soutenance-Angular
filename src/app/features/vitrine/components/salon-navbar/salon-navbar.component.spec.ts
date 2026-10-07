import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { SalonNavbarComponent } from './salon-navbar.component';
import { AuthService } from '../../../../core/auth/services/auth.service';

describe('SalonNavbarComponent', () => {
  let component: SalonNavbarComponent;
  let fixture: ComponentFixture<SalonNavbarComponent>;
  let authService: any;
  const isAuthSignal = signal<boolean>(false);
  const rolesSignal = signal<string[]>([]);
  const userSignal = signal<any>(null);

  beforeEach(async () => {
    isAuthSignal.set(false);
    rolesSignal.set([]);
    userSignal.set(null);

    authService = {
      isAuthenticated: isAuthSignal,
      currentRoles: rolesSignal,
      currentUser: userSignal,
      logout: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SalonNavbarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SalonNavbarComponent);
    component = fixture.componentInstance;
    component.slugSalon = 'salon-kady';
    component.salon = {
      id: 1,
      nom: 'Salon Kady',
      slug: 'salon-kady',
      actif: true
    } as any;
    fixture.detectChanges();
  });

  it('devrait créer le composant navbar', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le bouton connexion si le visiteur n\'est pas connecté', () => {
    const el: HTMLElement = fixture.nativeElement;
    const loginBtn = el.querySelector('.btn-salon-login');
    expect(loginBtn).toBeTruthy();
    const clientTrigger = el.querySelector('.btn-client-trigger');
    expect(clientTrigger).toBeNull();
  });

  it('affiche le dropdown client avec ses initiales et ses sous-pages quand le client est connecté', () => {
    isAuthSignal.set(true);
    rolesSignal.set(['CLIENT']);
    userSignal.set({ prenom: 'Fatou', nom: 'Diop' });
    fixture.detectChanges();

    expect(component.isClient).toBe(true);
    expect(component.userDisplayName).toBe('Fatou Diop');
    expect(component.userInitials).toBe('FD');

    const el: HTMLElement = fixture.nativeElement;
    const clientTrigger = el.querySelector('.btn-client-trigger');
    expect(clientTrigger).toBeTruthy();

    // Ouvrir le dropdown
    component.isClientDropdownOpen.set(true);
    fixture.detectChanges();

    const menu = el.querySelector('.client-dropdown-menu');
    expect(menu).toBeTruthy();

    // Vérifier les 9 liens dédiés du portail client
    const links = el.querySelectorAll('.client-menu-item');
    expect(links.length).toBe(9);
    expect(links[0].getAttribute('href')).toContain('client/rdv');
    expect(links[1].getAttribute('href')).toContain('client/commandes');
    expect(links[2].getAttribute('href')).toContain('client/prestations');
    expect(links[3].getAttribute('href')).toContain('client/paiements');
    expect(links[4].getAttribute('href')).toContain('client/favoris');
    expect(links[5].getAttribute('href')).toContain('client/profil-capillaire');
    expect(links[6].getAttribute('href')).toContain('client/avis');
    expect(links[7].getAttribute('href')).toContain('client/reclamations');
    expect(links[8].getAttribute('href')).toContain('client/compte');
  });

  it('ouvre et ferme le menu mobile avec la section client dédiée', () => {
    isAuthSignal.set(true);
    rolesSignal.set(['CLIENT']);
    userSignal.set({ prenom: 'Aminata', nom: 'Sow' });
    fixture.detectChanges();

    expect(component.isMobileMenuOpen).toBe(false);
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBe(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const mobileClientSection = el.querySelector('.mobile-client-section');
    expect(mobileClientSection).toBeTruthy();
    expect(mobileClientSection?.textContent).toContain('Aminata Sow');
  });
});
