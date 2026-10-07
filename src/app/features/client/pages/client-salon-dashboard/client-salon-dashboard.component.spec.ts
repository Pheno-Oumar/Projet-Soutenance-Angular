import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ClientSalonDashboardComponent } from './client-salon-dashboard.component';
import { ClientSalonService } from '../../../../core/services/client-salon.service';
import { ClientPlateformeService } from '../../../../core/services/client-plateforme.service';
import { VitrineService } from '../../../../core/services/vitrine.service';
import { PanierService } from '../../../../core/services/panier.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { GuestStorageService } from '../../../../core/services/guest-storage.service';
import {
  RendezVous,
  Commande,
  Prestation,
  Paiement,
  FavoriCoiffeur,
  AvisSalon,
  AvisPrestation,
  Reclamation,
  Compte,
  ProfilCapillaire,
  Salon
} from '../../../../shared/models';

describe('ClientSalonDashboardComponent', () => {
  let component: ClientSalonDashboardComponent;
  let fixture: ComponentFixture<ClientSalonDashboardComponent>;
  let clientSalonServiceMock: any;
  let clientPlateformeServiceMock: any;
  let vitrineServiceMock: any;
  let panierServiceMock: any;
  let authServiceMock: any;
  let notificationServiceMock: any;
  let guestStorageMock: any;
  let routerMock: any;

  const mockSalon: Partial<Salon> = {
    id: 1,
    nom: 'Élégance Bamako',
    slug: 'elegance-bamako',
    telephone: '+223 70 00 00 00'
  };

  const mockRdvs: RendezVous[] = [
    {
      id: 10,
      clientNom: 'Diallo',
      clientEmail: 'amadou@test.com',
      dateHeure: '2026-10-10T14:30:00',
      statut: 'CONFIRME',
      typeRdv: 'AVEC_RENDEZ_VOUS',
      services: ['Coupe Dégradé Américain'],
      coiffeurNom: 'Mamadou Koné'
    }
  ];

  const mockCommandes: Commande[] = [
    {
      id: 101,
      numeroCommande: 'CMD-101',
      codeRetrait: 'RET-8899',
      statut: 'VALIDEE',
      montantTotal: 15000,
      dateCommande: '2026-10-04T12:00:00',
      clientNom: 'Amadou Diallo',
      clientEmail: 'amadou@test.com',
      lignes: [
        { id: 1, produitId: 1, produitNom: 'Huile de Ricin Pure', quantite: 1, prixUnitaire: 5000, sousTotal: 5000 },
        { id: 2, produitId: 2, produitNom: 'Shampoing Hydratant', quantite: 2, prixUnitaire: 5000, sousTotal: 10000 }
      ]
    }
  ];

  const mockPrestations: Prestation[] = [
    {
      id: 201,
      salonSlug: 'elegance-bamako',
      datePrestation: '2026-09-20T11:00:00',
      statut: 'TERMINE',
      montantTotal: 8000,
      lignes: [{ id: 1, serviceNom: 'Soin Capillaire Profond', prix: 8000 }]
    }
  ];

  const mockPaiements: Paiement[] = [
    {
      id: 301,
      numeroPaiement: 'PAY-2026-001',
      factureId: 50,
      montant: 8000,
      moyenPaiement: 'ORANGE_MONEY',
      datePaiement: '2026-09-20T12:00:00',
      type: 'ORANGE_MONEY',
      statut: 'VALIDE'
    }
  ];

  const mockFavoris: FavoriCoiffeur[] = [
    {
      id: 1,
      coiffeurId: 5,
      coiffeurNomComplet: 'Awa Keita',
      salonSlug: 'elegance-bamako',
      salonNom: 'Élégance Bamako',
      clientId: 1,
      dateAjout: '2026-10-01'
    }
  ];

  const mockAvisPrestations: AvisPrestation[] = [
    {
      id: 401,
      lignePrestationId: 1,
      prestationId: 201,
      serviceNom: 'Soin Capillaire Profond',
      coiffeurId: 3,
      clientId: 1,
      note: 5,
      commentaire: 'Excellente prestation !',
      statut: true,
      dateCreation: '2026-09-21T10:00:00'
    }
  ];

  const mockAvisSalon: AvisSalon = {
    id: 501,
    salonSlug: 'elegance-bamako',
    clientId: 1,
    note: 5,
    commentaire: 'Le meilleur salon de Bamako',
    statut: true,
    dateCreation: '2026-09-22T15:00:00'
  };

  const mockReclamations: Reclamation[] = [
    {
      id: 601,
      objet: 'Retard créneau',
      description: 'Attente de 25 minutes',
      statut: 'EN_ATTENTE',
      dateCreation: '2026-09-25T14:00:00'
    }
  ];

  const mockCompte: Compte = {
    id: 1,
    prenom: 'Amadou',
    nom: 'Diallo',
    email: 'amadou@test.com',
    telephone: '+223 76 00 11 22',
    dateNaissance: '1995-05-15',
    statut: true
  };

  const mockProfilCapillaire: ProfilCapillaire = {
    id: 1,
    compteId: 1,
    nomClient: 'Diallo',
    prenomClient: 'Amadou',
    typeCheveux: '4C',
    texture: 'Crépus',
    longueur: 'Mi-longs',
    cuirChevelu: 'Sec',
    sensibilites: 'Sensible aux sulfates',
    allergiesProduits: 'Aucune',
    observations: 'Préfère les huiles végétales pures',
    hasCodeProfil: true
  };

  beforeEach(async () => {
    clientSalonServiceMock = {
      listerMesRendezVous: vi.fn().mockReturnValue(of(mockRdvs)),
      listerCommandes: vi.fn().mockReturnValue(of(mockCommandes)),
      listerMesPrestations: vi.fn().mockReturnValue(of(mockPrestations)),
      listerMesPaiements: vi.fn().mockReturnValue(of(mockPaiements)),
      listerMesCoiffeursFavoris: vi.fn().mockReturnValue(of(mockFavoris)),
      listerMesAvisPrestations: vi.fn().mockReturnValue(of(mockAvisPrestations)),
      getMonAvisSalon: vi.fn().mockReturnValue(of(mockAvisSalon)),
      creerAvisPrestation: vi.fn().mockReturnValue(of(mockAvisPrestations[0])),
      creerAvisSalon: vi.fn().mockReturnValue(of(mockAvisSalon)),
      modifierAvisSalon: vi.fn().mockReturnValue(of(mockAvisSalon)),
      deposerReclamation: vi.fn().mockReturnValue(of(mockReclamations[0])),
      listerMesReclamations: vi.fn().mockReturnValue(of(mockReclamations)),
      annulerRendezVous: vi.fn().mockReturnValue(of({})),
      retirerCoiffeurFavori: vi.fn().mockReturnValue(of({})),
      reserverRendezVous: vi.fn().mockReturnValue(of({}))
    };

    clientPlateformeServiceMock = {
      getCompte: vi.fn().mockReturnValue(of(mockCompte)),
      updateCompte: vi.fn().mockReturnValue(of(mockCompte)),
      getProfilCapillaire: vi.fn().mockReturnValue(of(mockProfilCapillaire)),
      updateProfilCapillaire: vi.fn().mockReturnValue(of(mockProfilCapillaire)),
      changerCodeProfil: vi.fn().mockReturnValue(of({})),
      changerMotDePasse: vi.fn().mockReturnValue(of({}))
    };

    vitrineServiceMock = {
      getInfosSalon: vi.fn().mockReturnValue(of(mockSalon))
    };

    panierServiceMock = {
      chargerPanier: vi.fn()
    };

    authServiceMock = {
      currentUser: signal(mockCompte),
      isAuthenticated: signal(true)
    };

    notificationServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    };

    guestStorageMock = {
      recupererReservationEnCours: vi.fn().mockReturnValue(null),
      viderReservationEnCours: vi.fn()
    };

    routerMock = {
      navigate: vi.fn()
    };

    const activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'slugSalon' ? 'elegance-bamako' : null)
        }
      },
      data: of({ tab: 'RENDEZ_VOUS' }),
      parent: null
    };

    await TestBed.configureTestingModule({
      imports: [ClientSalonDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ClientSalonService, useValue: clientSalonServiceMock },
        { provide: ClientPlateformeService, useValue: clientPlateformeServiceMock },
        { provide: VitrineService, useValue: vitrineServiceMock },
        { provide: PanierService, useValue: panierServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: GuestStorageService, useValue: guestStorageMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientSalonDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant de l’espace VIP client salon', () => {
    expect(component).toBeTruthy();
    expect(component.slugSalon).toBe('elegance-bamako');
  });

  it('devrait charger tous les flux salon et plateforme du client', () => {
    expect(clientSalonServiceMock.listerMesRendezVous).toHaveBeenCalledWith('elegance-bamako');
    expect(clientSalonServiceMock.listerCommandes).toHaveBeenCalledWith('elegance-bamako');
    expect(clientSalonServiceMock.listerMesPrestations).toHaveBeenCalledWith('elegance-bamako');
    expect(clientSalonServiceMock.listerMesPaiements).toHaveBeenCalledWith('elegance-bamako');
    expect(clientSalonServiceMock.listerMesCoiffeursFavoris).toHaveBeenCalledWith('elegance-bamako');
    expect(clientSalonServiceMock.listerMesReclamations).toHaveBeenCalledWith('elegance-bamako');
    expect(clientPlateformeServiceMock.getCompte).toHaveBeenCalled();
    expect(clientPlateformeServiceMock.getProfilCapillaire).toHaveBeenCalled();

    expect(component.rendezVous().length).toBe(1);
    expect(component.commandes().length).toBe(1);
    expect(component.prestations().length).toBe(1);
    expect(component.paiements().length).toBe(1);
    expect(component.coiffeursFavoris().length).toBe(1);
    expect(component.reclamations().length).toBe(1);
    expect(component.compte()?.prenom).toBe('Amadou');
    expect(component.profilCapillaire()?.typeCheveux).toBe('4C');
  });

  it('devrait basculer d’onglet et naviguer vers la route correspondante', () => {
    component.setTab('COMMANDES');
    expect(component.activeTab()).toBe('COMMANDES');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/elegance-bamako/client/commandes']);

    component.setTab('PROFIL_CAPILLAIRE');
    expect(component.activeTab()).toBe('PROFIL_CAPILLAIRE');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/elegance-bamako/client/profil-capillaire']);
  });

  it('devrait valider et mettre à jour le code PIN à 6 chiffres', () => {
    // Mauvais code PIN (< 6 chiffres)
    component.pinDigits = ['1', '2', '3', '', '', ''];
    component.changerCodePin();
    expect(notificationServiceMock.error).toHaveBeenCalledWith(
      'Le code PIN de consultation coiffeur doit comporter exactement 6 chiffres numériques.'
    );

    // Bon code PIN (6 chiffres)
    component.pinDigits = ['1', '2', '3', '4', '5', '6'];
    component.changerCodePin();
    expect(clientPlateformeServiceMock.changerCodeProfil).toHaveBeenCalledWith('123456');
    expect(notificationServiceMock.success).toHaveBeenCalledWith(
      'Votre code PIN secret à 6 chiffres a été configuré avec succès !'
    );
  });

  it('devrait permettre de mettre à jour le diagnostic capillaire', () => {
    component.selectHairType('4B');
    component.selectTexture('Très denses / volumineux');
    component.enregistrerProfilCapillaire();
    expect(clientPlateformeServiceMock.updateProfilCapillaire).toHaveBeenCalledWith(component.profilForm);
  });

  it('devrait permettre de soumettre un avis sur une prestation', () => {
    const prest = mockPrestations[0];
    component.ouvrirModalAvisPrestation(prest, 1);
    expect(component.avisPrestationModalOpen).toBe(true);

    component.avisNote = 5;
    component.avisCommentaire = 'Très bon coiffage';
    component.soumettreAvisPrestation();

    expect(clientSalonServiceMock.creerAvisPrestation).toHaveBeenCalledWith('elegance-bamako', {
      lignePrestationId: 1,
      note: 5,
      commentaire: 'Très bon coiffage'
    });
    expect(component.avisPrestationModalOpen).toBe(false);
  });

  it('devrait permettre de déposer une réclamation', () => {
    component.ouvrirModalReclamation();
    expect(component.reclamationModalOpen).toBe(true);

    component.reclamationObjet = 'Retard excessif';
    component.reclamationDescription = 'Attente de 45 minutes sans explication';
    component.soumettreReclamation();

    expect(clientSalonServiceMock.deposerReclamation).toHaveBeenCalledWith('elegance-bamako', {
      objet: 'Retard excessif',
      description: 'Attente de 45 minutes sans explication'
    });
    expect(component.reclamationModalOpen).toBe(false);
  });

  it('devrait permettre de changer le mot de passe de manière sécurisée', () => {
    component.motDePasseForm = {
      ancienMotDePasse: 'Ancien123',
      nouveauMotDePasse: 'Nouveau456',
      confirmMotDePasse: 'Nouveau456'
    };

    component.changerMotDePasse();
    expect(clientPlateformeServiceMock.changerMotDePasse).toHaveBeenCalledWith('Ancien123', 'Nouveau456');
  });

  it('devrait gérer la modal d’annulation de rendez-vous', () => {
    const rdv = mockRdvs[0];
    component.ouvrirModalAnnulation(rdv);
    expect(component.cancelModalOpen).toBe(true);

    component.cancelMotif = 'Imprévu';
    component.confirmerAnnulation();

    expect(clientSalonServiceMock.annulerRendezVous).toHaveBeenCalledWith('elegance-bamako', 10, {
      motif: 'Imprévu'
    });
    expect(component.cancelModalOpen).toBe(false);
  });

  it('devrait retourner les libellés et étapes des commandes', () => {
    expect(component.getCommandeStatutLabel('VALIDEE')).toBe('Validée & Prête au salon');
    expect(component.getCommandeStep('EN_ATTENTE')).toBe(1);
    expect(component.getCommandeStep('VALIDEE')).toBe(3);
    expect(component.getCommandeStep('RECUPEREE')).toBe(4);
  });
});
