import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProprietaireService } from './proprietaire.service';
import { environment } from '../../../../environments/environment';

describe('ProprietaireService', () => {
  let service: ProprietaireService;
  let httpTestingController: HttpTestingController;
  const slug = 'mon-beau-salon';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProprietaireService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ProprietaireService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET /{slugSalon}/proprietaire/salon', () => {
    service.getSalon(slug).subscribe(res => {
      expect(res.data.slug).toBe(slug);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/proprietaire/salon`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: { id: 1, nom: 'Mon Salon', slug, statut: true } });
  });

  it('should call GET /{slugSalon}/proprietaire/kpi', () => {
    service.getKpiSalon(slug).subscribe(res => {
      expect(res.data.nombreClients).toBe(10);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/proprietaire/kpi`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: { slugSalon: slug, nombreClients: 10 } });
  });
});
