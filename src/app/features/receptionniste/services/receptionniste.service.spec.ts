import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReceptionnisteService } from './receptionniste.service';
import { environment } from '../../../../environments/environment';

describe('ReceptionnisteService', () => {
  let service: ReceptionnisteService;
  let httpTestingController: HttpTestingController;
  const slug = 'mon-beau-salon';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReceptionnisteService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ReceptionnisteService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET /{slugSalon}/receptionniste/clients with query param', () => {
    service.rechercherClients(slug, 'Diop').subscribe(res => {
      expect(res.data.length).toBe(1);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/receptionniste/clients?query=Diop`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: [{ id: 1, nom: 'Diop', prenom: 'Mamadou' }] });
  });

  it('should call PATCH /{slugSalon}/receptionniste/rendez-vous/10/annuler', () => {
    service.annulerRendezVous(slug, 10, { motif: 'Client absent' }).subscribe((res: any) => {
      expect(res.success).toBe(true);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/receptionniste/rendez-vous/10/annuler`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, message: 'OK', data: { id: 10, statut: 'ANNULE' } });
  });
});
