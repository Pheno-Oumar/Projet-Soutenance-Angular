import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProprietaireFermeturesComponent } from './proprietaire-fermetures.component';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { FermetureExceptionnelle } from '../../../../shared/models';

describe('ProprietaireFermeturesComponent', () => {
  let component: ProprietaireFermeturesComponent;
  let fixture: ComponentFixture<ProprietaireFermeturesComponent>;
  let proprietaireServiceMock: any;
  let notificationServiceMock: any;

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const mockFermetures: FermetureExceptionnelle[] = [
    {
      id: 1,
      dateDebut: tomorrow,
      dateFin: nextWeek,
      motif: 'Congés d’été',
      dateCreation: today
    },
    {
      id: 2,
      dateDebut: '2026-01-01',
      dateFin: '2026-01-03',
      motif: 'Jour de l’An passé',
      dateCreation: '2025-12-20'
    }
  ];

  beforeEach(async () => {
    proprietaireServiceMock = {
      listerFermetures: vi.fn().mockReturnValue(of({ success: true, data: mockFermetures })),
      ajouterFermeture: vi.fn().mockReturnValue(of({ success: true, data: mockFermetures[0] })),
      modifierFermeture: vi.fn().mockReturnValue(of({ success: true, data: mockFermetures[0] })),
      supprimerFermeture: vi.fn().mockReturnValue(of({ success: true })),
      mettreFinFermeture: vi.fn().mockReturnValue(of({ success: true, data: mockFermetures[0] }))
    };

    notificationServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProprietaireFermeturesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'slugSalon' ? 'salon-test' : null)
              }
            },
            parent: null
          }
        },
        { provide: ProprietaireService, useValue: proprietaireServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProprietaireFermeturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant et charger les fermetures existantes', () => {
    expect(component).toBeTruthy();
    expect(proprietaireServiceMock.listerFermetures).toHaveBeenCalledWith('salon-test');
    expect(component.fermetures().length).toBe(2);
  });

  it('devrait interdire formellement de créer une fermeture avec une date de début dans le passé', () => {
    component.openCreateModal();
    component.formData.dateDebut = yesterday;
    component.formData.dateFin = tomorrow;
    component.formData.motif = 'Fermeture rétroactive interdite';

    component.soumettreFormulaire();

    expect(notificationServiceMock.error).toHaveBeenCalledWith(
      'La date de début ne peut pas être dans le passé.',
      'Date invalide'
    );
    expect(proprietaireServiceMock.ajouterFermeture).not.toHaveBeenCalled();
  });

  it('devrait refuser une date de début postérieure à la date de fin', () => {
    component.openCreateModal();
    component.formData.dateDebut = nextWeek;
    component.formData.dateFin = tomorrow;
    component.formData.motif = 'Dates incohérentes';

    component.soumettreFormulaire();

    expect(notificationServiceMock.error).toHaveBeenCalledWith(
      'La date de début ne peut pas être postérieure à la date de fin.',
      'Dates invalides'
    );
    expect(proprietaireServiceMock.ajouterFermeture).not.toHaveBeenCalled();
  });

  it('devrait enregistrer avec succès une fermeture programmée dans le futur', () => {
    component.openCreateModal();
    component.formData.dateDebut = tomorrow;
    component.formData.dateFin = nextWeek;
    component.formData.motif = 'Inventaire annuel';

    component.soumettreFormulaire();

    expect(proprietaireServiceMock.ajouterFermeture).toHaveBeenCalledWith('salon-test', {
      dateDebut: tomorrow,
      dateFin: nextWeek,
      motif: 'Inventaire annuel'
    });
    expect(notificationServiceMock.success).toHaveBeenCalledWith(
      'La fermeture exceptionnelle a été enregistrée avec succès.',
      'Fermeture créée'
    );
    expect(component.showModal).toBe(false);
  });

  it('devrait refuser de modifier une fermeture passée', () => {
    const fermeturePassee = mockFermetures[1];
    component.openEditModal(fermeturePassee);

    expect(notificationServiceMock.error).toHaveBeenCalledWith(
      'Impossible de modifier une fermeture exceptionnelle passée.',
      'Fermeture passée'
    );
    expect(component.showModal).toBe(false);
  });

  it('devrait détecter correctement si une fermeture passée peut être modifiée ou supprimée', () => {
    const fermetureFuture = mockFermetures[0];
    const fermeturePassee = mockFermetures[1];

    expect(component.canDelete(fermetureFuture)).toBe(true);
    expect(component.canDelete(fermeturePassee)).toBe(false);

    expect(component.canEdit(fermetureFuture)).toBe(true);
    expect(component.canEdit(fermeturePassee)).toBe(false);
  });

  it('devrait ajuster dateFin automatiquement si dateDebut devient postérieure', () => {
    component.formData.dateDebut = tomorrow;
    component.formData.dateFin = tomorrow;

    component.formData.dateDebut = nextWeek;
    component.onDateDebutChange();

    expect(component.formData.dateFin).toBe(nextWeek);
  });
});
