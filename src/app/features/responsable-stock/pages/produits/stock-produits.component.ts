import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ResponsableStockService } from '../../services/responsable-stock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import {
  Produit,
  CategorieProduit,
  ProduitCreateDto,
  ProduitUpdateDto,
  ProduitRentabilite,
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
  private readonly confirmationService = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly Math = Math;

  readonly produits = signal<Produit[]>([]);
  readonly categories = signal<CategorieProduit[]>([]);
  readonly rentabiliteMap = signal<Map<number, ProduitRentabilite>>(new Map());

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filtres
  searchQuery: string = '';
  selectedCategorieFilter: number | '' = '';
  selectedStatutFilter: string = 'TOUS'; // TOUS, ACTIF, INACTIF
  selectedStockFilter: string = 'TOUS'; // TOUS, ALERTE, RUPTURE
  selectedSortFilter: string = 'DEFAULT'; // DEFAULT, MARGE_DESC, TAUX_MARGE_DESC, VENTES_DESC, BENEFICE_DESC

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
  selectedCreateImageFiles: File[] = [];
  createImagePreviews: string[] = [];

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
  selectedNewImageFiles: File[] = [];
  newImagePreviews: string[] = [];
  existingTargetImages: string[] = [];

  // Vue Mode : GRILLE ou RENTABILITE
  vueMode: 'GRILLE' | 'RENTABILITE' = 'GRILLE';

  // Modal Ajuster Prix
  readonly isAjusterPrixModalOpen = signal<boolean>(false);
  readonly isSubmittingAjusterPrix = signal<boolean>(false);
  ajusterPrixProduitCible: Produit | null = null;
  nouveauPrixVenteSaisi: number = 0;

  // Modal Mouvement Rapide
  readonly isMouvementModalOpen = signal<boolean>(false);
  readonly isSubmittingMouvement = signal<boolean>(false);
  mouvementProduit: Produit | null = null;
  mouvementType: string = 'ENTREE';
  mouvementQuantite: number = 10;
  mouvementPrixUnitaire: number = 0;
  mouvementNouveauPrixVente: number = 0;
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
      catsRes: this.stockService.listerCategories(slug),
      rentablesRes: this.stockService.getProduitsRentables(slug, 200)
    }).subscribe({
      next: ({ prodsRes, catsRes, rentablesRes }) => {
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
        if (rentablesRes.success && rentablesRes.data) {
          const map = new Map<number, ProduitRentabilite>();
          rentablesRes.data.forEach(r => map.set(r.produitId, r));
          this.rentabiliteMap.set(map);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement des produits.');
      }
    });
  }

  getRentabilite(produitId: number): ProduitRentabilite | undefined {
    return this.rentabiliteMap().get(produitId);
  }

  // Filtrage et Tri des produits calculé
  get filteredProduits(): Produit[] {
    let list = this.produits().filter(p => {
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

    // Tri par rentabilité ou ventes
    if (this.selectedSortFilter === 'MARGE_DESC') {
      list.sort((a, b) => {
        const ra = this.rentabiliteMap().get(a.id)?.margeUnitaire ?? 0;
        const rb = this.rentabiliteMap().get(b.id)?.margeUnitaire ?? 0;
        return rb - ra;
      });
    } else if (this.selectedSortFilter === 'TAUX_MARGE_DESC') {
      list.sort((a, b) => {
        const ra = this.rentabiliteMap().get(a.id)?.tauxMarge ?? 0;
        const rb = this.rentabiliteMap().get(b.id)?.tauxMarge ?? 0;
        return rb - ra;
      });
    } else if (this.selectedSortFilter === 'VENTES_DESC') {
      list.sort((a, b) => {
        const ra = this.rentabiliteMap().get(a.id)?.quantiteVendue ?? 0;
        const rb = this.rentabiliteMap().get(b.id)?.quantiteVendue ?? 0;
        return rb - ra;
      });
    } else if (this.selectedSortFilter === 'BENEFICE_DESC') {
      list.sort((a, b) => {
        const ra = this.rentabiliteMap().get(a.id)?.beneficeTotal ?? 0;
        const rb = this.rentabiliteMap().get(b.id)?.beneficeTotal ?? 0;
        return rb - ra;
      });
    }

    return list;
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
    this.selectedCreateImageFiles = [];
    this.createImagePreviews = [];
    this.isCreateModalOpen.set(true);
  }

  fermerModalCreation(): void {
    this.isCreateModalOpen.set(false);
    this.selectedCreateImageFile = null;
    this.createImagePreview = null;
    this.selectedCreateImageFiles = [];
    this.createImagePreviews = [];
  }

  onFileSelectedCreate(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      for (const file of files) {
        this.selectedCreateImageFiles.push(file);
        const reader = new FileReader();
        reader.onload = () => {
          this.createImagePreviews.push(reader.result as string);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
      if (!this.selectedCreateImageFile && this.selectedCreateImageFiles.length > 0) {
        this.selectedCreateImageFile = this.selectedCreateImageFiles[0];
      }
      input.value = '';
    }
  }

  removeCreateImage(index: number): void {
    this.selectedCreateImageFiles.splice(index, 1);
    this.createImagePreviews.splice(index, 1);
    this.selectedCreateImageFile = this.selectedCreateImageFiles[0] || null;
    this.createImagePreview = this.createImagePreviews[0] || null;
    this.cdr.detectChanges();
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
      prixAchatUnitaire: this.newProduitPrixAchat || undefined,
      prixAchatInitial: this.newProduitPrixAchat || undefined
    };

    this.isSubmittingCreate.set(true);
    const imagesToSend = this.selectedCreateImageFiles.length > 0 ? this.selectedCreateImageFiles : (this.selectedCreateImageFile || undefined);
    this.stockService.ajouterProduit(slug, this.newProduitCategorieId, payload, imagesToSend).subscribe({
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
    this.existingTargetImages = (p.imagesUrls && p.imagesUrls.length > 0) ? [...p.imagesUrls] : (p.imageUrl ? [p.imageUrl] : []);
    this.selectedNewImageFile = null;
    this.newImagePreview = null;
    this.selectedNewImageFiles = [];
    this.newImagePreviews = [];
    this.isImageModalOpen.set(true);
  }

  fermerModalImage(): void {
    this.isImageModalOpen.set(false);
    this.imageTargetProduit = null;
    this.selectedNewImageFile = null;
    this.newImagePreview = null;
    this.selectedNewImageFiles = [];
    this.newImagePreviews = [];
    this.existingTargetImages = [];
  }

  onFileSelectedNew(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      for (const file of files) {
        this.selectedNewImageFiles.push(file);
        const reader = new FileReader();
        reader.onload = () => {
          this.newImagePreviews.push(reader.result as string);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
      if (!this.selectedNewImageFile && this.selectedNewImageFiles.length > 0) {
        this.selectedNewImageFile = this.selectedNewImageFiles[0];
      }
      input.value = '';
    }
  }

  removeNewImage(index: number): void {
    this.selectedNewImageFiles.splice(index, 1);
    this.newImagePreviews.splice(index, 1);
    this.selectedNewImageFile = this.selectedNewImageFiles[0] || null;
    this.newImagePreview = this.newImagePreviews[0] || null;
    this.cdr.detectChanges();
  }

  validerUploadImage(): void {
    const slug = this.slugSalon;
    const filesToUpload = this.selectedNewImageFiles.length > 0 ? this.selectedNewImageFiles : (this.selectedNewImageFile ? [this.selectedNewImageFile] : []);
    if (!slug || !this.imageTargetProduit || filesToUpload.length === 0) {
      this.notificationService.warning('Veuillez sélectionner au moins un fichier image valide.');
      return;
    }

    this.isSubmittingImage.set(true);
    this.stockService.uploadImageProduit(slug, this.imageTargetProduit.id, filesToUpload).subscribe({
      next: (res) => {
        this.isSubmittingImage.set(false);
        if (res.data) {
          this.imageTargetProduit = res.data;
          this.existingTargetImages = (res.data.imagesUrls && res.data.imagesUrls.length > 0)
            ? [...res.data.imagesUrls]
            : (res.data.imageUrl ? [res.data.imageUrl] : []);
          this.selectedNewImageFiles = [];
          this.newImagePreviews = [];
          this.selectedNewImageFile = null;
          this.newImagePreview = null;
        }
        const count = filesToUpload.length;
        const msg = count > 1
          ? `${count} photos ajoutées avec succès au produit « ${res.data?.nom} ».`
          : `Photo ajoutée avec succès au produit « ${res.data?.nom} ».`;
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

  async supprimerPhotoExistante(imageUrl: string): Promise<void> {
    const slug = this.slugSalon;
    if (!slug || !this.imageTargetProduit) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Supprimer cette photo ?',
      message: 'Voulez-vous vraiment retirer cette photo du produit ? Cette action est irréversible.',
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) return;

    this.isSubmittingImage.set(true);
    this.stockService.supprimerImageProduit(slug, this.imageTargetProduit.id, imageUrl).subscribe({
      next: (res) => {
        this.isSubmittingImage.set(false);
        if (res?.data) {
          this.imageTargetProduit = res.data;
          this.existingTargetImages = (res.data.imagesUrls && res.data.imagesUrls.length > 0)
            ? [...res.data.imagesUrls]
            : (res.data.imageUrl ? [res.data.imageUrl] : []);
        }
        this.notificationService.success('La photo a été retirée du produit.');
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingImage.set(false);
        this.notificationService.error(err?.error?.message || 'Erreur lors de la suppression de la photo.');
      }
    });
  }

  definirCommePrincipale(imageUrl: string): void {
    const slug = this.slugSalon;
    if (!slug || !this.imageTargetProduit) return;

    this.isSubmittingImage.set(true);
    this.stockService.definirImagePrincipaleProduit(slug, this.imageTargetProduit.id, imageUrl).subscribe({
      next: (res) => {
        this.isSubmittingImage.set(false);
        if (res?.data) {
          this.imageTargetProduit = res.data;
          this.existingTargetImages = (res.data.imagesUrls && res.data.imagesUrls.length > 0)
            ? [...res.data.imagesUrls]
            : (res.data.imageUrl ? [res.data.imageUrl] : []);
        }
        this.notificationService.success('Cette photo est désormais la photo principale du produit.');
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingImage.set(false);
        this.notificationService.error(err?.error?.message || 'Impossible de définir cette photo comme principale.');
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
    this.mouvementNouveauPrixVente = p.prixVente;
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
      nouveauPrixVente: this.mouvementType === 'ENTREE' && this.mouvementNouveauPrixVente > 0 ? this.mouvementNouveauPrixVente : undefined,
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

  // --- AJUSTEMENT RAPIDE DU PRIX DE VENTE ---

  ouvrirModalAjusterPrix(p: Produit): void {
    this.ajusterPrixProduitCible = p;
    this.nouveauPrixVenteSaisi = p.prixVente;
    this.isAjusterPrixModalOpen.set(true);
  }

  fermerModalAjusterPrix(): void {
    this.isAjusterPrixModalOpen.set(false);
    this.ajusterPrixProduitCible = null;
  }

  validerAjustementPrix(): void {
    const slug = this.slugSalon;
    if (!slug || !this.ajusterPrixProduitCible) return;

    if (!this.nouveauPrixVenteSaisi || this.nouveauPrixVenteSaisi <= 0) {
      this.notificationService.warning('Veuillez saisir un prix de vente valide supérieur à 0.');
      return;
    }

    this.isSubmittingAjusterPrix.set(true);
    this.stockService.ajusterPrixProduit(slug, this.ajusterPrixProduitCible.id, this.nouveauPrixVenteSaisi).subscribe({
      next: (res) => {
        this.isSubmittingAjusterPrix.set(false);
        const prodNom = res.data?.nom || this.ajusterPrixProduitCible?.nom || 'Produit';
        this.fermerModalAjusterPrix();
        this.successMessage.set(`Prix du produit « ${prodNom} » mis à jour à ${this.formatMontant(this.nouveauPrixVenteSaisi)}.`);
        this.notificationService.success(`Prix du produit « ${prodNom} » mis à jour à ${this.formatMontant(this.nouveauPrixVenteSaisi)}.`);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.chargerDonnees();
      },
      error: (err) => {
        this.isSubmittingAjusterPrix.set(false);
        const errDesc = err.error?.message || 'Erreur lors de la modification du prix';
        this.errorMessage.set(errDesc);
        this.notificationService.error(errDesc);
      }
    });
  }

  getSimulatedMargeUnitaire(): number {
    if (!this.ajusterPrixProduitCible) return 0;
    const rent = this.getRentabilite(this.ajusterPrixProduitCible.id);
    const pa = rent?.prixAchatMoyen || 0;
    return this.nouveauPrixVenteSaisi - pa;
  }

  getSimulatedTauxMarge(): number {
    if (!this.ajusterPrixProduitCible) return 0;
    const rent = this.getRentabilite(this.ajusterPrixProduitCible.id);
    const pa = rent?.prixAchatMoyen;
    if (pa && pa > 0) {
      return Math.round(((this.nouveauPrixVenteSaisi - pa) / pa) * 1000) / 10;
    }
    return 100;
  }

  getSimulatedNiveau(): string {
    const tm = this.getSimulatedTauxMarge();
    if (tm >= 60) return 'TRES_RENTABLE';
    if (tm >= 35) return 'RENTABLE';
    if (tm >= 15) return 'MOYEN';
    return 'FAIBLE';
  }

  formatMontant(val?: number): string {
    if (val === undefined || val === null) return '0 FCFA';
    return `${new Intl.NumberFormat('fr-FR').format(val)} FCFA`;
  }
}
