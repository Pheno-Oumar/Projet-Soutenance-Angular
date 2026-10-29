import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ProduitsConseilsListComponent } from './produits-conseils-list.component';
import { ProduitsConseilsFormComponent } from './produits-conseils-form.component';
import { ProduitsConseilsDetailModalComponent } from './produits-conseils-detail-modal.component';
import { ProduitConseil } from '../../../../shared/models';

describe('ProduitsConseils Unit Tests', () => {
  const mockProduit: ProduitConseil = {
    id: 1,
    nom: 'Sérum Argan Bio',
    marque: 'Kady Care',
    description: 'Soin nourrissant et protecteur',
    modeUtilisation: 'Appliquer quelques gouttes sur les pointes',
    imageUrl: 'https://test.com/serum.webp',
    etapeRoutine: 'FINITION',
    actif: true,
    cuirsChevelusCibles: ['NORMAL', 'SEC'],
    etatsCheveuxCibles: ['SEC'],
    porositesCibles: ['FORTE'],
    typesCheveuxCibles: ['CREPUS', 'FRISES'],
    texturesCibles: ['EPAIS']
  };

  describe('ProduitsConseilsDetailModalComponent', () => {
    let comp: ProduitsConseilsDetailModalComponent;

    beforeEach(() => {
      comp = new ProduitsConseilsDetailModalComponent();
      comp.produit = mockProduit;
    });

    it('should return correct step info', () => {
      const info = comp.getEtapeInfo('FINITION');
      expect(info.label).toBe('Finition & Scellage');
      expect(info.badgeClass).toBe('badge-finition');
    });

    it('should return human-readable labels for targets', () => {
      expect(comp.getTypeLabel('CREPUS')).toContain('Crépus');
      expect(comp.getPorositeLabel('FORTE')).toContain('Forte');
      expect(comp.getTextureLabel('EPAIS')).toContain('Épais');
      expect(comp.getEtatLabel('SEC')).toContain('Secs');
      expect(comp.getCuirLabel('NORMAL')).toContain('Normal');
    });
  });

  describe('ProduitsConseilsListComponent filter & search logic', () => {
    let comp: ProduitsConseilsListComponent;
    let serviceSpy: any;

    beforeEach(() => {
      serviceSpy = {
        lister: vi.fn().mockReturnValue(of({ success: true, data: [mockProduit] })),
        getStatistiques: vi.fn().mockReturnValue(
          of({
            success: true,
            data: { total: 1, actifs: 1, inactifs: 0, parEtape: { FINITION: 1 } }
          })
        ),
        basculerStatut: vi.fn().mockReturnValue(of({ success: true, data: { ...mockProduit, actif: false } })),
        supprimer: vi.fn().mockReturnValue(of({ success: true, message: 'OK' }))
      };

      comp = new (ProduitsConseilsListComponent as any)();
      (comp as any).service = serviceSpy;
      (comp as any).router = { navigate: vi.fn() };
      comp.produits.set([mockProduit]);
    });

    it('should filter products by search query', () => {
      expect(comp.filteredProduits().length).toBe(1);

      comp.searchQuery = 'Argan';
      expect(comp.filteredProduits().length).toBe(1);

      comp.searchQuery = 'Inexistant';
      expect(comp.filteredProduits().length).toBe(0);
    });

    it('should filter products by routine step', () => {
      comp.selectedEtape.set('LAVAGE');
      expect(comp.filteredProduits().length).toBe(0);

      comp.selectedEtape.set('FINITION');
      expect(comp.filteredProduits().length).toBe(1);
    });

    it('should filter products by active status', () => {
      comp.selectedStatut.set('ACTIVE');
      expect(comp.filteredProduits().length).toBe(1);

      comp.selectedStatut.set('INACTIVE');
      expect(comp.filteredProduits().length).toBe(0);
    });

    it('should toggle product active status via service', () => {
      comp.basculerStatut(mockProduit);
      expect(serviceSpy.basculerStatut).toHaveBeenCalledWith(1);
    });
  });

  describe('ProduitsConseilsFormComponent state management', () => {
    let comp: ProduitsConseilsFormComponent;
    let serviceSpy: any;

    beforeEach(() => {
      serviceSpy = {
        getById: vi.fn().mockReturnValue(of({ success: true, data: mockProduit })),
        creer: vi.fn().mockReturnValue(of({ success: true, data: mockProduit })),
        modifier: vi.fn().mockReturnValue(of({ success: true, data: mockProduit })),
        uploadImage: vi.fn().mockReturnValue(of({ success: true, data: mockProduit }))
      };

      comp = new (ProduitsConseilsFormComponent as any)();
      (comp as any).service = serviceSpy;
      (comp as any).route = { snapshot: { paramMap: { get: vi.fn().mockReturnValue(null) } } };
      (comp as any).router = { navigate: vi.fn() };
    });

    it('should initialize with default values', () => {
      expect(comp.nom).toBe('');
      expect(comp.etapeRoutine).toBe('LAVAGE');
      expect(comp.actif).toBe(true);
    });

    it('should populate form when editProduit is set', () => {
      comp.populateForm(mockProduit);
      expect(comp.nom).toBe('Sérum Argan Bio');
      expect(comp.marque).toBe('Kady Care');
      expect(comp.etapeRoutine).toBe('FINITION');
      expect(comp.selectedTypes.has('CREPUS')).toBe(true);
      expect(comp.selectedCuirs.has('SEC')).toBe(true);
    });

    it('should toggle selection tags correctly', () => {
      comp.toggleType('LISSES');
      expect(comp.selectedTypes.has('LISSES')).toBe(true);

      comp.toggleType('LISSES');
      expect(comp.selectedTypes.has('LISSES')).toBe(false);
    });
  });
});
