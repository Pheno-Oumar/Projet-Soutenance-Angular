import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ProprietaireCompteComponent } from './proprietaire-compte.component';
import { ProprietaireService } from '../../services/proprietaire.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Employe } from '../../../../shared/models';

describe('ProprietaireCompteComponent', () => {
  let component: ProprietaireCompteComponent;
  let fixture: ComponentFixture<ProprietaireCompteComponent>;

  let mockProprietaireService: any;
  let mockAuthService: any;
  let mockNotificationService: any;

  const mockEmploye: Employe = {
    affectationId: 10,
    compteId: 100,
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'proprio@test.com',
    telephone: '0102030405',
    statut: true,
    roles: ['PROPRIETAIRE', 'CLIENT']
  };

  beforeEach(async () => {
    mockProprietaireService = {
      getProfil: vi.fn().mockReturnValue(of({
        success: true,
        message: 'OK',
        data: {
          id: 100,
          email: 'proprio@test.com',
          nom: 'Dupont',
          prenom: 'Jean',
          telephone: '0102030405',
          dateNaissance: '1985-05-15',
          statut: true
        }
      })),
      getMesRoles: vi.fn().mockReturnValue(of({
        success: true,
        message: 'OK',
        data: mockEmploye
      })),
      updateMesRoles: vi.fn().mockReturnValue(of({
        success: true,
        message: 'OK',
        data: mockEmploye
      })),
      updateProfil: vi.fn().mockReturnValue(of({
        success: true,
        message: 'OK',
        data: {}
      })),
      changerMotDePasse: vi.fn().mockReturnValue(of({
        success: true,
        message: 'OK'
      })),
      transfererPropriete: vi.fn().mockReturnValue(of({
        success: true,
        message: 'OK'
      }))
    };

    mockAuthService = {
      currentRoles: vi.fn().mockReturnValue(['PROPRIETAIRE', 'CLIENT']),
      currentSalonContext: vi.fn().mockReturnValue({
        slugSalon: 'mon-salon',
        nomSalon: 'Mon Salon',
        actif: true,
        roles: ['PROPRIETAIRE', 'CLIENT']
      }),
      setSalonContext: vi.fn(),
      logout: vi.fn().mockReturnValue(of({ success: true }))
    };

    mockNotificationService = {
      success: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProprietaireCompteComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ProprietaireService, useValue: mockProprietaireService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'mon-salon' } },
            parent: null
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProprietaireCompteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load roles on init', () => {
    expect(component).toBeTruthy();
    expect(component.mesRoles()).toContain('PROPRIETAIRE');
    expect(component.mesRoles()).toContain('CLIENT');
  });

  it('should prevent toggling out the PROPRIETAIRE role', () => {
    component.toggleOperationalRole('PROPRIETAIRE');
    expect(mockNotificationService.error).toHaveBeenCalled();
    expect(component.mesRoles()).toContain('PROPRIETAIRE');
  });

  it('should allow toggling operational roles such as COIFFEUR', () => {
    expect(component.isRoleActive('COIFFEUR')).toBe(false);

    component.toggleOperationalRole('COIFFEUR');
    expect(component.isRoleActive('COIFFEUR')).toBe(true);
    expect(component.mesRoles()).toContain('COIFFEUR');

    component.toggleOperationalRole('COIFFEUR');
    expect(component.isRoleActive('COIFFEUR')).toBe(false);
  });

  it('should save updated roles and update AuthService salon context', () => {
    component.toggleOperationalRole('COIFFEUR');

    const updatedEmploye: Employe = {
      ...mockEmploye,
      roles: ['PROPRIETAIRE', 'CLIENT', 'COIFFEUR']
    };
    mockProprietaireService.updateMesRoles = vi.fn().mockReturnValue(of({
      success: true,
      message: 'OK',
      data: updatedEmploye
    }));

    component.enregistrerMesRoles();

    expect(mockProprietaireService.updateMesRoles).toHaveBeenCalledWith('mon-salon', component.mesRoles());
    expect(mockAuthService.setSalonContext).toHaveBeenCalledWith(
      'mon-salon',
      ['PROPRIETAIRE', 'CLIENT', 'COIFFEUR'],
      'Mon Salon',
      true,
      undefined
    );
    expect(mockNotificationService.success).toHaveBeenCalled();
  });

  it('should open and close transfer modal', () => {
    expect(component.showTransferModal()).toBe(false);
    component.openTransferModal();
    expect(component.showTransferModal()).toBe(true);
    component.closeTransferModal();
    expect(component.showTransferModal()).toBe(false);
  });
});
