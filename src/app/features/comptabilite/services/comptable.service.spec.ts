import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComptableService } from './comptable.service';
import { environment } from '../../../../environments/environment';

describe('ComptableService', () => {
  let service: ComptableService;
  let httpTestingController: HttpTestingController;
  const slug = 'mon-beau-salon';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ComptableService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ComptableService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call POST /{slugSalon}/comptable/caisse/sessions', () => {
    service.ouvrirSession(slug, { soldeOuverture: 50000 }).subscribe(res => {
      expect(res.data.soldeOuverture).toBe(50000);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/comptable/caisse/sessions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ soldeOuverture: 50000 });
    req.flush({ success: true, message: 'OK', data: { id: 1, soldeOuverture: 50000 } });
  });

  it('should call GET /{slugSalon}/comptable/rapports/kpi', () => {
    service.getKpiFinanciers(slug).subscribe(res => {
      expect(res.data.chiffreAffairesTotal).toBe(1500000);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/comptable/rapports/kpi`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: { slugSalon: slug, chiffreAffairesTotal: 1500000 } });
  });
});
