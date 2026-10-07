import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminSystemService } from './admin-system.service';
import { environment } from '../../../../environments/environment';

describe('AdminSystemService', () => {
  let service: AdminSystemService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminSystemService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AdminSystemService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET /admin-systeme/salons', () => {
    service.listerSalons().subscribe(res => {
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/admin-systeme/salons`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: [{ id: 1, nom: 'Salon VIP', slug: 'salon-vip', statut: true }] });
  });

  it('should call GET /admin-systeme/kpi', () => {
    service.getKpiPlateforme().subscribe(res => {
      expect(res.data.nombreSalonsTotal).toBe(5);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/admin-systeme/kpi`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: { nombreSalonsTotal: 5 } });
  });
});
