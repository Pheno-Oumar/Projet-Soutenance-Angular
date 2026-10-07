import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ManagerService } from './manager.service';
import { environment } from '../../../../environments/environment';

describe('ManagerService', () => {
  let service: ManagerService;
  let httpTestingController: HttpTestingController;
  const slug = 'mon-beau-salon';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ManagerService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ManagerService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET /{slugSalon}/manager/reclamations', () => {
    service.listerReclamations(slug).subscribe(res => {
      expect(res.data.length).toBe(1);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/manager/reclamations`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: [{ id: 1, objet: 'Retard', statut: 'EN_ATTENTE' }] });
  });

  it('should call PATCH /{slugSalon}/manager/avis/prestations/1/statut', () => {
    service.modererAvisPrestation(slug, 1, true).subscribe(res => {
      expect(res.data.statut).toBe(true);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/manager/avis/prestations/1/statut`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ statut: true });
    req.flush({ success: true, message: 'OK', data: { id: 1, statut: true } });
  });
});
