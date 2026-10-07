import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ResponsableStockService } from './responsable-stock.service';
import { environment } from '../../../../environments/environment';

describe('ResponsableStockService', () => {
  let service: ResponsableStockService;
  let httpTestingController: HttpTestingController;
  const slug = 'mon-beau-salon';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ResponsableStockService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ResponsableStockService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET /{slugSalon}/responsable-stock/produits/bientot-en-rupture', () => {
    service.getProduitsBientotEnRupture(slug).subscribe(res => {
      expect(res.data.length).toBe(1);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/responsable-stock/produits/bientot-en-rupture`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: [{ produitId: 1, nomProduit: 'Shampoing', stockActuel: 2 }] });
  });

  it('should call PATCH /{slugSalon}/responsable-stock/commandes/42/valider', () => {
    service.validerCommande(slug, 42).subscribe(res => {
      expect(res.data.statut).toBe('VALIDEE');
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/responsable-stock/commandes/42/valider`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, message: 'OK', data: { id: 42, statut: 'VALIDEE' } });
  });
});
