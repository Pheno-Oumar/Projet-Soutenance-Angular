import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { SalonsListComponent } from './salons/salons-list.component';
import { SalonsFormComponent } from './salons/salons-form.component';
import { SalonsDetailComponent } from './salons/salons-detail.component';
import { ReglesListComponent } from './regles/regles-list.component';
import { AuditListComponent } from './audit/audit-list.component';
import { RgpdListComponent } from './rgpd/rgpd-list.component';
import { AdminCompteComponent } from './compte/admin-compte.component';
import { AdminSystemService } from '../services/admin-system.service';

describe('Admin Plateforme Pages', () => {
  let adminServiceSpy: any;

  beforeEach(async () => {
    adminServiceSpy = {
      getKpiPlateforme: vi.fn().mockReturnValue(
        of({
          data: {
            nombreSalonsTotal: 5,
            nombreSalonsActifs: 4,
            nombreSalonsInactifs: 1,
            nombreComptesTotal: 25,
            nombreComptesActifs: 24,
            nombreComptesInactifs: 1,
            nombreRendezVousTotal: 120,
            nombrePrestationsTotal: 150,
            nombrePrestationsTerminees: 110,
            chiffreAffairesGlobal: 2500000
          }
        })
      ),
      listerSalons: vi.fn().mockReturnValue(
        of({
          data: [
            {
              id: 1,
              nom: 'Salon Cocody Prestige',
              slug: 'salon-cocody-prestige',
              statut: true,
              nombreClients: 45,
              nombreEmployes: 6,
              chiffreAffaires: 1200000,
              nombreCommandes: 34,
              latitude: 5.359952,
              longitude: -4.008256
            }
          ]
        })
      ),
      getSalon: vi.fn().mockReturnValue(
        of({
          data: {
            id: 1,
            nom: 'Salon Cocody Prestige',
            slug: 'salon-cocody-prestige',
            statut: true,
            nombreClients: 45,
            nombreEmployes: 6,
            chiffreAffaires: 1200000,
            nombreCommandes: 34,
            latitude: 5.359952,
            longitude: -4.008256
          }
        })
      ),
      creerSalon: vi.fn().mockReturnValue(
        of({
          data: {
            id: 2,
            nom: 'Nouveau Salon Test',
            slug: 'nouveau-salon-test',
            statut: true
          }
        })
      ),
      listerRegles: vi.fn().mockReturnValue(
        of({
          data: [
            {
              id: 1,
              titre: 'Conditions Générales Plateforme',
              description: 'Politique standard',
              actif: true,
              dateCreation: '2026-01-01'
            }
          ]
        })
      ),
      listerLogs: vi.fn().mockReturnValue(
        of({
          data: [
            {
              id: 1,
              dateHeure: '2026-03-01T10:00:00Z',
              action: 'CONNEXION',
              entite: 'Compte',
              compteEmail: 'admin@aon.ci'
            }
          ]
        })
      ),
      listerDemandesSuppression: vi.fn().mockReturnValue(
        of({
          data: [
            {
              id: 1,
              compteId: 10,
              compteEmail: 'user@test.ci',
              motif: 'Départ définitif',
              statut: 'EN_ATTENTE',
              dateDemande: '2026-03-01T12:00:00Z'
            }
          ]
        })
      ),
      getProfil: vi.fn().mockReturnValue(
        of({
          data: {
            id: 1,
            nom: 'Administrateur',
            prenom: 'Plateforme',
            email: 'admin@aon.ci',
            telephone: '+225 01 02 03 04 05',
            dateNaissance: '1990-01-01',
            statut: true
          }
        })
      )
    };

    await TestBed.configureTestingModule({
      imports: [
        AdminDashboardComponent,
        SalonsListComponent,
        SalonsFormComponent,
        SalonsDetailComponent,
        ReglesListComponent,
        AuditListComponent,
        RgpdListComponent,
        AdminCompteComponent
      ],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AdminSystemService, useValue: adminServiceSpy }
      ]
    }).compileComponents();
  });

  it('should initialize AdminDashboardComponent and load KPIs', () => {
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp).toBeTruthy();
    expect(adminServiceSpy.getKpiPlateforme).toHaveBeenCalled();
    expect(comp.kpis()?.nombreSalonsTotal).toBe(5);
  });

  it('should initialize SalonsListComponent and display salons with enriched metrics', () => {
    const fixture = TestBed.createComponent(SalonsListComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp).toBeTruthy();
    expect(adminServiceSpy.listerSalons).toHaveBeenCalled();
    expect(comp.salons().length).toBe(1);
    expect(comp.salons()[0].nombreClients).toBe(45);
    expect(comp.salons()[0].chiffreAffaires).toBe(1200000);
  });

  it('should validate that latitude and longitude are optional in SalonsFormComponent', () => {
    const fixture = TestBed.createComponent(SalonsFormComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp).toBeTruthy();

    comp.salonForm.patchValue({
      nom: 'Salon sans GPS',
      emailProprietaire: 'owner@salon.com'
    });

    expect(comp.salonForm.valid).toBe(true);
    expect(comp.salonForm.get('latitude')?.value).toBeNull();
    expect(comp.salonForm.get('longitude')?.value).toBeNull();
  });

  it('should initialize SalonsDetailComponent', () => {
    const fixture = TestBed.createComponent(SalonsDetailComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp).toBeTruthy();
  });

  it('should initialize ReglesListComponent and load rules', () => {
    const fixture = TestBed.createComponent(ReglesListComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp).toBeTruthy();
    expect(adminServiceSpy.listerRegles).toHaveBeenCalled();
    expect(comp.regles().length).toBe(1);
  });

  it('should initialize AuditListComponent and load logs', () => {
    const fixture = TestBed.createComponent(AuditListComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp).toBeTruthy();
    expect(adminServiceSpy.listerLogs).toHaveBeenCalled();
    expect(comp.logs().length).toBe(1);
  });

  it('should initialize RgpdListComponent and load suppression requests', () => {
    const fixture = TestBed.createComponent(RgpdListComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp).toBeTruthy();
    expect(adminServiceSpy.listerDemandesSuppression).toHaveBeenCalled();
    expect(comp.demandes().length).toBe(1);
  });

  it('should initialize AdminCompteComponent and populate form', () => {
    const fixture = TestBed.createComponent(AdminCompteComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp).toBeTruthy();
    expect(adminServiceSpy.getProfil).toHaveBeenCalled();
    expect(comp.profilForm.get('nom')?.value).toBe('Administrateur');
  });
});
