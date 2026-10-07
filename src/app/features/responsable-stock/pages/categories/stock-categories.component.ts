import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ResponsableStockService } from '../../services/responsable-stock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  CategorieProduit,
  CategorieProduitCreateDto,
  CategorieProduitUpdateDto,
  ProduitInitialDto,
  ProduitCreateDto
} from '../../../../shared/models';

@Component({
  selector: 'app-stock-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './stock-categories.component.html',
  styleUrl: './stock-categories.component.css'
})
export class StockCategoriesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly stockService = inject(ResponsableStockService);
  private readonly notificationService = inject(NotificationService);

  readonly categories = signal<CategorieProduit[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filtres
  searchQuery: string = '';
  statutFilter: string = 'TOUS'; // TOUS, ACTIF, INACTIF

  // Modal Création Catégorie
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isSubmittingCreate = signal<boolean>(false);
  newCatNom: string = '';
  newCatDescription: string = '';
  selectedCatImageFile: File | null = null;
  catImagePreview: string | null = null;



  // Modal Édition Catégorie
  readonly isEditModalOpen = signal<boolean>(false);
  readonly isSubmittingEdit = signal<boolean>(false);
  editingCat: CategorieProduit | null = null;
  editCatNom: string = '';
  editCatDescription: string = '';

  // Modal Remplacement Image Catégorie
  readonly isImageModalOpen = signal<boolean>(false);
  readonly isSubmittingImage = signal<boolean>(false);
  targetImageCat: CategorieProduit | null = null;
  selectedNewCatImageFile: File | null = null;
  newCatImagePreview: string | null = null;

  // Modal Ajout Produit Direct dans Catégorie
  readonly isAddProductModalOpen = signal<boolean>(false);
  readonly isSubmittingAddProduct = signal<boolean>(false);
  targetCatForProduct: CategorieProduit | null = null;
  addProdNom: string = '';
  addProdDescription: string = '';
  addProdPrixVente: number = 5000;
  addProdQuantite: number = 10;
  addProdSeuilMin: number = 5;
  addProdSeuilMax: number | null = 50;
  addProdPrixAchat: number | null = 3000;
  addProdImageFile: File | null = null;
  addProdImagePreview: string | null = null;

  ngOnInit(): void {
    this.chargerCategories();
  }

  get slugSalon(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const slug = r.snapshot.paramMap.get('slugSalon');
      if (slug) return slug;
      r = r.parent;
    }
    return '';
  }

  chargerCategories(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stockService.listerCategories(slug).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.categories.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des catégories.');
      }
    });
  }

  get filteredCategories(): CategorieProduit[] {
    return this.categories().filter(c => {
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchesNom = c.nom.toLowerCase().includes(q);
        const matchesDesc = c.description ? c.description.toLowerCase().includes(q) : false;
        if (!matchesNom && !matchesDesc) return false;
      }
      if (this.statutFilter === 'ACTIF' && !c.statut) return false;
      if (this.statutFilter === 'INACTIF' && c.statut) return false;
      return true;
    });
  }

  // --- CRÉATION CATÉGORIE ---

  ouvrirModalCreation(): void {
    this.newCatNom = '';
    this.newCatDescription = '';
    this.selectedCatImageFile = null;
    this.catImagePreview = null;



    this.isCreateModalOpen.set(true);
  }

  fermerModalCreation(): void {
    this.isCreateModalOpen.set(false);
    this.selectedCatImageFile = null;
    this.catImagePreview = null;
  }

  onFileSelectedCat(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedCatImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.catImagePreview = reader.result as string;
      reader.readAsDataURL(this.selectedCatImageFile);
    }
  }

  validerCreation(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.newCatNom.trim()) {
      this.notificationService.warning('Le nom de la catégorie est obligatoire.');
      return;
    }

    const payload: CategorieProduitCreateDto = {
      nom: this.newCatNom.trim(),
      description: this.newCatDescription.trim() || undefined,
      produits: []
    };

    this.isSubmittingCreate.set(true);
    this.stockService.creerCategorie(slug, payload, this.selectedCatImageFile || undefined).subscribe({
      next: (res) => {
        this.isSubmittingCreate.set(false);
        this.fermerModalCreation();
        const msg = `Catégorie « ${res.data?.nom} » créée avec succès !`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4500);
        this.chargerCategories();
      },
      error: (err) => {
        this.isSubmittingCreate.set(false);
        const errDesc = err.error?.message || 'Erreur lors de la création de la catégorie';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  // --- ÉDITION CATÉGORIE ---

  ouvrirModalEdit(cat: CategorieProduit): void {
    this.editingCat = cat;
    this.editCatNom = cat.nom;
    this.editCatDescription = cat.description || '';
    this.isEditModalOpen.set(true);
  }

  fermerModalEdit(): void {
    this.isEditModalOpen.set(false);
    this.editingCat = null;
  }

  validerEdit(): void {
    const slug = this.slugSalon;
    if (!slug || !this.editingCat) return;

    if (!this.editCatNom.trim()) {
      this.notificationService.warning('Le nom de la catégorie est obligatoire.');
      return;
    }

    const payload: CategorieProduitUpdateDto = {
      nom: this.editCatNom.trim(),
      description: this.editCatDescription.trim() || undefined
    };

    this.isSubmittingEdit.set(true);
    this.stockService.modifierCategorie(slug, this.editingCat.id, payload).subscribe({
      next: (res) => {
        this.isSubmittingEdit.set(false);
        this.fermerModalEdit();
        const msg = `Catégorie « ${res.data?.nom} » mise à jour avec succès.`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerCategories();
      },
      error: (err) => {
        this.isSubmittingEdit.set(false);
        const errDesc = err.error?.message || 'Erreur lors de la mise à jour de la catégorie';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  // --- IMAGE CATÉGORIE ---

  ouvrirModalImage(cat: CategorieProduit): void {
    this.targetImageCat = cat;
    this.selectedNewCatImageFile = null;
    this.newCatImagePreview = cat.imageUrl || null;
    this.isImageModalOpen.set(true);
  }

  fermerModalImage(): void {
    this.isImageModalOpen.set(false);
    this.targetImageCat = null;
    this.selectedNewCatImageFile = null;
    this.newCatImagePreview = null;
  }

  onFileSelectedNewCat(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedNewCatImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.newCatImagePreview = reader.result as string;
      reader.readAsDataURL(this.selectedNewCatImageFile);
    }
  }

  validerUploadImage(): void {
    const slug = this.slugSalon;
    if (!slug || !this.targetImageCat || !this.selectedNewCatImageFile) {
      this.notificationService.warning('Veuillez sélectionner un fichier image valide.');
      return;
    }

    this.isSubmittingImage.set(true);
    this.stockService.uploadImageCategorie(slug, this.targetImageCat.id, this.selectedNewCatImageFile).subscribe({
      next: (res) => {
        this.isSubmittingImage.set(false);
        this.fermerModalImage();
        const msg = `Image de la catégorie « ${res.data?.nom} » mise à jour.`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerCategories();
      },
      error: (err) => {
        this.isSubmittingImage.set(false);
        const errDesc = err.error?.message || 'Erreur lors du téléversement de l’image';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  // --- STATUT CATÉGORIE ---

  basculerStatut(cat: CategorieProduit): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.stockService.basculerStatutCategorie(slug, cat.id).subscribe({
      next: (res) => {
        const etat = res.data?.statut ? 'activée' : 'désactivée';
        this.successMessage.set(`Catégorie « ${cat.nom} » ${etat}.`);
        setTimeout(() => this.successMessage.set(null), 3500);
        this.chargerCategories();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Erreur lors du changement de statut');
      }
    });
  }

  // --- AJOUT PRODUIT DIRECT DANS CETTE CATÉGORIE ---

  ouvrirModalAjoutProduit(cat: CategorieProduit): void {
    this.targetCatForProduct = cat;
    this.addProdNom = '';
    this.addProdDescription = '';
    this.addProdPrixVente = 5000;
    this.addProdQuantite = 10;
    this.addProdSeuilMin = 5;
    this.addProdSeuilMax = 50;
    this.addProdPrixAchat = 3000;
    this.addProdImageFile = null;
    this.addProdImagePreview = null;
    this.isAddProductModalOpen.set(true);
  }

  fermerModalAjoutProduit(): void {
    this.isAddProductModalOpen.set(false);
    this.targetCatForProduct = null;
  }

  onFileSelectedAddProd(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addProdImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.addProdImagePreview = reader.result as string;
      reader.readAsDataURL(this.addProdImageFile);
    }
  }

  validerAjoutProduit(): void {
    const slug = this.slugSalon;
    if (!slug || !this.targetCatForProduct) return;

    if (!this.addProdNom.trim()) {
      this.notificationService.warning('Le nom du produit est obligatoire.');
      return;
    }
    if (this.addProdPrixVente <= 0) {
      this.notificationService.warning('Le prix de vente doit être supérieur à 0.');
      return;
    }

    const payload: ProduitCreateDto = {
      nom: this.addProdNom.trim(),
      description: this.addProdDescription.trim() || undefined,
      prixVente: this.addProdPrixVente,
      quantiteInitiale: this.addProdQuantite,
      seuilMinimum: this.addProdSeuilMin,
      seuilMaximum: this.addProdSeuilMax || undefined,
      prixAchatUnitaire: this.addProdPrixAchat || undefined
    };

    this.isSubmittingAddProduct.set(true);
    this.stockService.ajouterProduit(slug, this.targetCatForProduct.id, payload, this.addProdImageFile || undefined).subscribe({
      next: (res) => {
        this.isSubmittingAddProduct.set(false);
        this.fermerModalAjoutProduit();
        const msg = `Produit « ${res.data?.nom} » ajouté à ${this.targetCatForProduct?.nom}.`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4500);
        this.chargerCategories();
      },
      error: (err) => {
        this.isSubmittingAddProduct.set(false);
        const errDesc = err.error?.message || 'Erreur lors de l’ajout du produit';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  formatMontant(val?: number): string {
    if (val === undefined || val === null) return '0 FCFA';
    return `${new Intl.NumberFormat('fr-FR').format(val)} FCFA`;
  }
}
