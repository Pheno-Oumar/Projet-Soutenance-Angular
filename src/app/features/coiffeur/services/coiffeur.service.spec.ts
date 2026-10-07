import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CoiffeurService } from './coiffeur.service';
import { environment } from '../../../../environments/environment';

describe('CoiffeurService', () => {
  let service: CoiffeurService;
  let httpTestingController: HttpTestingController;
  const slug = 'mon-beau-salon';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CoiffeurService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(CoiffeurService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET /{slugSalon}/coiffeur/profil', () => {
    service.getProfil(slug).subscribe(res => {
      expect(res.data.nomAffichage).toBe('Master Barber');
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/coiffeur/profil`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: { id: 1, nomAffichage: 'Master Barber' } });
  });

  it('should call POST /{slugSalon}/coiffeur/profil-capillaire/5/consulter', () => {
    service.consulterProfilCapillaireClient(slug, 5, { codeProfil: '123456' }).subscribe(res => {
      expect(res.data.nomClient).toBe('Kane');
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}/${slug}/coiffeur/profil-capillaire/5/consulter`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ codeProfil: '123456' });
    req.flush({ success: true, message: 'OK', data: { id: 1, nomClient: 'Kane' } });
  });
});
