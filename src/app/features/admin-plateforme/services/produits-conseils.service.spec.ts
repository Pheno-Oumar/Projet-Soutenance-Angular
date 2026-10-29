import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { ProduitsConseilsService } from './produits-conseils.service';
import { ProduitConseil, ProduitConseilDto } from '../../../shared/models';

describe('ProduitsConseilsService', () => {
  let service: ProduitsConseilsService;
  let httpClientSpy: {
    get: any;
    post: any;
    put: any;
    patch: any;
    delete: any;
  };

  beforeEach(() => {
    httpClientSpy = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    };

    const injector = createEnvironmentInjector([
      ProduitsConseilsService,
      { provide: HttpClient, useValue: httpClientSpy }
    ]);
    service = injector.get(ProduitsConseilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should list products with query parameters', () => {
    const mockList: ProduitConseil[] = [
      {
        id: 1,
        nom: 'Shampoing Doux',
        etapeRoutine: 'LAVAGE',
        actif: true,
        cuirsChevelusCibles: [],
        etatsCheveuxCibles: [],
        porositesCibles: [],
        typesCheveuxCibles: [],
        texturesCibles: []
      }
    ];

    httpClientSpy.get.mockReturnValue(of({ success: true, message: 'OK', data: mockList }));

    service.lister({ actif: true, etapeRoutine: 'LAVAGE', recherche: 'doux' }).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);
      expect(res.data[0].nom).toBe('Shampoing Doux');
    });

    expect(httpClientSpy.get).toHaveBeenCalled();
  });

  it('should get statistics', () => {
    httpClientSpy.get.mockReturnValue(
      of({
        success: true,
        message: 'OK',
        data: { total: 10, actifs: 8, inactifs: 2, parEtape: { LAVAGE: 3 } }
      })
    );

    service.getStatistiques().subscribe((res) => {
      expect(res.data.total).toBe(10);
      expect(res.data.actifs).toBe(8);
    });

    expect(httpClientSpy.get).toHaveBeenCalled();
  });

  it('should toggle status', () => {
    httpClientSpy.patch.mockReturnValue(
      of({
        success: true,
        message: 'OK',
        data: { id: 1, nom: 'Test', actif: false, etapeRoutine: 'LAVAGE' }
      })
    );

    service.basculerStatut(1).subscribe((res) => {
      expect(res.data.actif).toBe(false);
    });

    expect(httpClientSpy.patch).toHaveBeenCalled();
  });

  it('should delete product', () => {
    httpClientSpy.delete.mockReturnValue(of({ success: true, message: 'Supprimé' }));

    service.supprimer(1).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    expect(httpClientSpy.delete).toHaveBeenCalled();
  });
});
