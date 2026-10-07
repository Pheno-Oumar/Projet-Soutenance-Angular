import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ResponsableStockService } from '../../services/responsable-stock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Produit,
  CategorieProduit,
  ProduitCreateDto,
  ProduitUpdateDto,
  MouvementStockCreateDto
} from '../../../../shared/models';

@Component({
  selector: 'app-stock-produits',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './stock-produits.component.html',
  styleUrl: './stock-produits.component.css'
})
export class StockProduitsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly stockService = inject(ResponsableStockService);
  private readonly notificationService = inject(NotificationService);

  readonly Math = Math;

  readonly produits = signal<Produit[]>([]);
  readonly categories = signal<CategorieProduit[]>([]);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filtres
  searchQuery: string = '';
  selectedCategorieFilter: number | '' = '';
  selectedStatutFilter: string = 'TOUS'; // TOUS, ACTIF, INACTIF
  selectedStockFilter: string = 'TOUS'; // TOUS, ALERTE, RUPTURE

  // Modal Création Produit
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isSubmittingCreate = signal<boolean>(false);
  newProduitCategorieId: number | null = null;
  newProduitNom: string = '';
  newProduitDescription: string = '';
  newProduitPrixVente: number = 5000;
  newProduitQuantiteInitiale: number = 10;
  newProduitSeuilMin: number = 5;
  newProduitSeuilMax: number | null = 50;
  newProduitPrixAchat: number | null = 3000;
  selectedCreateImageFile: File | null = null;
  createImagePreview: string | null = null;

  // Modal Modification Attributs
  readonly isEditModalOpen = signal<boolean>(false);
  readonly isSubmittingEdit = signal<boolean>(false);
  editingProduit: Produit | null = null;
  editNom: string = '';
  editDescription: string = '';
  editPrixVente: number = 0;
  editSeuilMin: number = 5;
  editSeuilMax: number | null = null;

  // Modal Remplacement Image
  readonly isImageModalOpen = signal<boolean>(false);
  readonly isSubmittingImage = signal<boolean>(false);
  imageTargetProduit: Produit | null = null;
  selectedNewImageFile: File | null = null;
  newImagePreview: string | null = null;

  // Modal Mouvement Rapide
  readonly isMouvementModalOpen = signal<boolean>(false);
  readonly isSubmittingMouvement = signal<boolean>(false);
  mouvementProduit: Produit | null = null;
  mouvementType: string = 'ENTREE';
  mouvementQuantite: number = 10;
  mouvementPrixUnitaire: number = 0;
  mouvementMotif: string = '';

  ngOnInit(): void {
    this.chargerDonnees();
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

  chargerDonnees(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      prodsRes: this.stockService.listerProduits(slug),
      catsRes: this.stockService.listerCategories(slug)
    }).subscribe({
      next: ({ prodsRes, catsRes }) => {
        this.isLoading.set(false);
        if (prodsRes.success && prodsRes.data) {
          this.produits.set(prodsRes.data);
        }
        if (catsRes.success && catsRes.data) {
          this.categories.set(catsRes.data);
          if (catsRes.data.length > 0 && !this.newProduitCategorieId) {
            this.newProduitCategorieId = catsRes.data[0].id;
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des produits.');
      }
    });
  }

  // Filtrage des produits calculé
  get filteredProduits(): Produit[] {
    return this.produits().filter(p => {
      // Recherche texte
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const matchesNom = p.nom.toLowerCase().includes(query);
        const matchesDesc = p.description ? p.description.toLowerCase().includes(query) : false;
        const matchesCat = p.categorieNom.toLowerCase().includes(query);
        if (!matchesNom && !matchesDesc && !matchesCat) return false;
      }
      // Filtre catégorie
      if (this.selectedCategorieFilter !== '' && p.categorieId !== Number(this.selectedCategorieFilter)) {
        return false;
      }
      // Filtre statut
      if (this.selectedStatutFilter === 'ACTIF' && !p.statut) return false;
      if (this.selectedStatutFilter === 'INACTIF' && p.statut) return false;

      // Filtre stock
      if (this.selectedStockFilter === 'ALERTE') {
        const qte = p.stock?.quantiteDisponible ?? 0;
        const seuil = p.stock?.seuilMinimum ?? 0;
        if (qte > seuil) return false;
      } else if (this.selectedStockFilter === 'RUPTURE') {
        const qte = p.stock?.quantiteDisponible ?? 0;
        if (qte > 0) return false;
      }

      return true;
    });
  }

  // --- CRÉATION DE PRODUIT ---

  ouvrirModalCreation(): void {
    if (this.categories().length === 0) {
      this.notificationService.warning('Veuillez d’abord créer au moins une catégorie avant d’ajouter un produit.');
      return;
    }
    this.newProduitCategorieId = this.categories()[0].id;
    this.newProduitNom = '';
    this.newProduitDescription = '';
    this.newProduitPrixVente = 5000;
    this.newProduitQuantiteInitiale = 10;
    this.newProduitSeuilMin = 5;
    this.newProduitSeuilMax = 50;
    this.newProduitPrixAchat = 3000;
    this.selectedCreateImageFile = null;
    this.createImagePreview = null;
    this.isCreateModalOpen.set(true);
  }

  fermerModalCreation(): void {
    this.isCreateModalOpen.set(false);
    this.selectedCreateImageFile = null;
    this.createImagePreview = null;
  }

  onFileSelectedCreate(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedCreateImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.createImagePreview = reader.result as string;
      reader.readAsDataURL(this.selectedCreateImageFile);
    }
  }

  validerCreation(): void {
    const slug = this.slugSalon;
    if (!slug || !this.newProduitCategorieId) return;

    if (!this.newProduitNom.trim()) {
      this.notificationService.warning('Le nom du produit est obligatoire.');
      return;
    }
    if (this.newProduitPrixVente <= 0) {
      this.notificationService.warning('Le prix de vente doit être supérieur à 0.');
      return;
    }

    const payload: ProduitCreateDto = {
      nom: this.newProduitNom.trim(),
      description: this.newProduitDescription.trim() || undefined,
      prixVente: this.newProduitPrixVente,
      quantiteInitiale: this.newProduitQuantiteInitiale,
      seuilMinimum: this.newProduitSeuilMin,
      seuilMaximum: this.newProduitSeuilMax || undefined,
      prixAchatUnitaire: this.newProduitPrixAchat || undefined
    };

    this.isSubmittingCreate.set(true);
    this.stockService.ajouterProduit(slug, this.newProduitCategorieId, payload, this.selectedCreateImageFile || undefined).subscribe({
      next: (res) => {
        this.isSubmittingCreate.set(false);
        this.fermerModalCreation();
        const msg = `Produit « ${res.data?.nom} » créé avec succès.`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4500);
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingCreate.set(false);
        const errDesc = err.error?.message || 'Erreur lors de la création du produit';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  // --- MODIFICATION ATTRIBUTS PRODUIT ---

  ouvrirModalEdit(p: Produit): void {
    this.editingProduit = p;
    this.editNom = p.nom;
    this.editDescription = p.description || '';
    this.editPrixVente = p.prixVente;
    this.editSeuilMin = p.stock?.seuilMinimum ?? 5;
    this.editSeuilMax = p.stock?.seuilMaximum ?? null;
    this.isEditModalOpen.set(true);
  }

  fermerModalEdit(): void {
    this.isEditModalOpen.set(false);
    this.editingProduit = null;
  }

  validerEdit(): void {
    const slug = this.slugSalon;
    if (!slug || !this.editingProduit) return;

    if (!this.editNom.trim()) {
      this.notificationService.warning('Le nom du produit est obligatoire.');
      return;
    }

    const payload: ProduitUpdateDto = {
      nom: this.editNom.trim(),
      description: this.editDescription.trim() || undefined,
      prixVente: this.editPrixVente,
      seuilMinimum: this.editSeuilMin,
      seuilMaximum: this.editSeuilMax || undefined
    };

    this.isSubmittingEdit.set(true);
    this.stockService.modifierProduit(slug, this.editingProduit.id, payload).subscribe({
      next: (res) => {
        this.isSubmittingEdit.set(false);
        this.fermerModalEdit();
        const msg = `Produit « ${res.data?.nom} » modifié avec succès.`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4500);
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingEdit.set(false);
        const errDesc = err.error?.message || 'Erreur lors de la modification';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  // --- REMPLACEMENT IMAGE PRODUIT ---

  ouvrirModalImage(p: Produit): void {
    this.imageTargetProduit = p;
    this.selectedNewImageFile = null;
    this.newImagePreview = p.imageUrl || null;
    this.isImageModalOpen.set(true);
  }

  fermerModalImage(): void {
    this.isImageModalOpen.set(false);
    this.imageTargetProduit = null;
    this.selectedNewImageFile = null;
    this.newImagePreview = null;
  }

  onFileSelectedNew(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedNewImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.newImagePreview = reader.result as string;
      reader.readAsDataURL(this.selectedNewImageFile);
    }
  }

  validerUploadImage(): void {
    const slug = this.slugSalon;
    if (!slug || !this.imageTargetProduit || !this.selectedNewImageFile) {
      this.notificationService.warning('Veuillez sélectionner un fichier image valide.');
      return;
    }

    this.isSubmittingImage.set(true);
    this.stockService.uploadImageProduit(slug, this.imageTargetProduit.id, this.selectedNewImageFile).subscribe({
      next: (res) => {
        this.isSubmittingImage.set(false);
        this.fermerModalImage();
        const msg = `Photo du produit « ${res.data?.nom} » mise à jour avec succès.`;
        this.successMessage.set(msg);
        this.notificationService.success(msg);
        setTimeout(() => this.successMessage.set(null), 4500);
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingImage.set(false);
        const errDesc = err.error?.message || 'Erreur lors de l’upload de l’image';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  // --- BASCULER STATUT ACTIF / INACTIF ---

  basculerStatut(p: Produit): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.stockService.basculerStatutProduit(slug, p.id).subscribe({
      next: (res) => {
        const etat = res.data?.statut ? 'activé' : 'désactivé';
        this.successMessage.set(`Produit « ${p.nom} » ${etat}.`);
        setTimeout(() => this.successMessage.set(null), 3500);
        this.chargerDonnees();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Erreur lors du changement de statut');
      }
    });
  }

  // --- MOUVEMENT RAPIDE SUR PRODUIT ---

  ouvrirModalMouvement(p: Produit): void {
    this.mouvementProduit = p;
    this.mouvementType = 'ENTREE';
    this.mouvementQuantite = 10;
    this.mouvementPrixUnitaire = Math.round(p.prixVente * 0.6);
    this.mouvementMotif = 'Réapprovisionnement stock boutique';
    this.isMouvementModalOpen.set(true);
  }

  fermerModalMouvement(): void {
    this.isMouvementModalOpen.set(false);
    this.mouvementProduit = null;
  }

  validerMouvement(): void {
    const slug = this.slugSalon;
    if (!slug || !this.mouvementProduit) return;

    if (this.mouvementQuantite <= 0) {
      this.notificationService.warning('Veuillez saisir une quantité positive.');
      return;
    }

    const payload: MouvementStockCreateDto = {
      produitId: this.mouvementProduit.id,
      quantite: this.mouvementQuantite,
      type: this.mouvementType,
      prixUnitaire: this.mouvementPrixUnitaire > 0 ? this.mouvementPrixUnitaire : undefined,
      motif: this.mouvementMotif.trim() || undefined
    };

    this.isSubmittingMouvement.set(true);
    this.stockService.enregistrerMouvement(slug, payload).subscribe({
      next: () => {
        this.isSubmittingMouvement.set(false);
        this.fermerModalMouvement();
        this.successMessage.set(`Flux ${payload.type} enregistré pour ${this.mouvementProduit?.nom}.`);
        setTimeout(() => this.successMessage.set(null), 4500);
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingMouvement.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de l’enregistrement du flux');
      }
    });
  }

  formatMontant(val?: number): string {
    if (val === undefined || val === null) return '0 FCFA';
    return `${new Intl.NumberFormat('fr-FR').format(val)} FCFA`;
  }
}
