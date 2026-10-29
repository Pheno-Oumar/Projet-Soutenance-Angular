import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BookingCheckoutComponent } from './booking-checkout.component';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { ClientSalonService } from '../../../../core/services/client-salon.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalonBookingStore } from '../../state/salon-booking.store';
import { SalonContextStore } from '../../state/salon-context.store';
import { CreneauDisponible, RendezVous } from '../../../../shared/models';

describe('BookingCheckoutComponent', () => {
  let component: BookingCheckoutComponent;
  let fixture: ComponentFixture<BookingCheckoutComponent>;
  let vitrineService: any;
  let clientSalonService: any;
  let authService: any;
  let notificationService: any;
  let bookingStore: SalonBookingStore;
  let contextStore: SalonContextStore;

  const mockSlot: CreneauDisponible = {
    heureDebut: '10:00',
    heureFin: '10:45',
    coiffeurId: 3,
    coiffeurNom: 'Moussa Traoré'
  };

  const mockRdv: RendezVous = {
    id: 42,
    clientNom: 'Touré',
    clientEmail: 'toure@test.com',
    dateHeure: '2026-10-06T10:00:00',
    statut: 'CONFIRME',
    typeRdv: 'AVEC_RENDEZ_VOUS',
    services: ['Coupe Homme']
  };

  beforeEach(async () => {
    vitrineService = {
      getDisponibilites: vi.fn().mockReturnValue(of([mockSlot])),
      reserverRendezVous: vi.fn().mockReturnValue(of(mockRdv)),
      registerClient: vi.fn().mockReturnValue(of({}))
    };

    clientSalonService = {
      reserverRendezVous: vi.fn().mockReturnValue(of(mockRdv))
    };

    authService = {
      isAuthenticated: vi.fn().mockReturnValue(false),
      currentUser: vi.fn().mockReturnValue(null)
    };

    notificationService = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [BookingCheckoutComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: VitrineService, useValue: vitrineService },
        { provide: ClientSalonService, useValue: clientSalonService },
        { provide: AuthService, useValue: authService },
        { provide: NotificationService, useValue: notificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingCheckoutComponent);
    component = fixture.componentInstance;
    bookingStore = TestBed.inject(SalonBookingStore);
    contextStore = TestBed.inject(SalonContextStore);

    contextStore.currentSlug.set('salon-luxe');
    bookingStore.clearBooking();
  });

  it('devrait créer le composant avec succès', () => {
    expect(component).toBeTruthy();
  });

  it('devrait bloquer la réservation si aucun créneau n\'est sélectionné', async () => {
    bookingStore.addVariante({
      id: 1,
      serviceNom: 'Coiffure',
      varianteNom: 'Coupe Simple',
      dureeMinutes: 30,
      prix: 5000
    });

    await component.validerReservation();

    expect(notificationService.error).toHaveBeenCalledWith('Veuillez sélectionner un créneau horaire.');
    expect(component.bookingConfirmed()).toBe(false);
  });

  it('devrait réserver et persister en BDD via clientSalonService si le client est connecté', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentUser.mockReturnValue({
      id: 10,
      email: 'client@test.com',
      nom: 'Diallo',
      prenom: 'Amadou',
      telephone: '0700000000'
    });

    bookingStore.addVariante({
      id: 1,
      serviceNom: 'Coiffure',
      varianteNom: 'Coupe Simple',
      dureeMinutes: 30,
      prix: 5000
    });
    bookingStore.setDateAndSlot('2026-10-06', mockSlot);
    component.selectedDate.set('2026-10-06');

    await component.validerReservation();

    expect(clientSalonService.reserverRendezVous).toHaveBeenCalledWith(
      'salon-luxe',
      expect.objectContaining({
        dateHeurePrevue: '2026-10-06T10:00:00',
        varianteIds: [1],
        coiffeurId: 3
      })
    );
    expect(component.bookingConfirmed()).toBe(true);
    expect(component.bookingReference()).toBe('RDV-2026-0042');
    expect(notificationService.success).toHaveBeenCalled();
  });

  it('devrait réserver et persister en BDD via vitrineService en mode visiteur invité', async () => {
    authService.isAuthenticated.mockReturnValue(false);

    bookingStore.addVariante({
      id: 2,
      serviceNom: 'Soin',
      varianteNom: 'Masque Kératine',
      dureeMinutes: 45,
      prix: 8000
    });
    bookingStore.setDateAndSlot('2026-10-06', mockSlot);
    component.selectedDate.set('2026-10-06');

    component.nomClient = 'Fatou Traoré';
    component.telephoneClient = '+223 70 12 34 56';
    component.emailClient = 'fatou@test.com';

    await component.validerReservation();

    expect(vitrineService.reserverRendezVous).toHaveBeenCalledWith(
      'salon-luxe',
      expect.objectContaining({
        dateHeurePrevue: '2026-10-06T10:00:00',
        varianteIds: [2],
        coiffeurId: 3,
        nom: 'Traoré',
        prenom: 'Fatou',
        email: 'fatou@test.com',
        telephone: '+223 70 12 34 56'
      })
    );
    expect(component.bookingConfirmed()).toBe(true);
    expect(component.bookingReference()).toBe('RDV-2026-0042');
    expect(notificationService.success).toHaveBeenCalled();
  });
});
