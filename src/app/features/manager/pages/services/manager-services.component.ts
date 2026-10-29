import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ManagerService } from '../../services/manager.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import {
  PrestationCatalogue,
  VarianteServiceDto,
  ServiceSalonCreateDto,
  ServiceSalonUpdateDto,
  VarianteCreateDto,
  VarianteUpdateDto
} from '../../../../shared/models';

@Component({
  selector: 'app-manager-services',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './manager-services.component.html',
  styleUrl: './manager-services.component.css'
})
export class ManagerServicesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly managerService = inject(ManagerService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly services = signal<PrestationCatalogue[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Navigation Vue Principale
  vueActive: 'catalogue' | 'espace-service' = 'catalogue';
  serviceActif: PrestationCatalogue | null = null;

  // Filtres & Recherche
  inclureInactifs = true;
  searchQuery = '';
  filtreStatut: 'TOUS' | 'ACTIF' | 'INACTIF' = 'TOUS';

  // --- KPI STATS COMPUTED ---
  readonly stats = computed(() => {
    const list = this.services();
    const totalServices = list.length;
    const servicesActifs = list.filter(s => s.statut).length;
    let totalVariantes = 0;
    let totalPhotos = 0;
    let minPrice: number | null = null;
    let maxPrice: number | null = null;

    for (const s of list) {
      if (s.imageUrl) totalPhotos++;
      if (s.variantes) {
        totalVariantes += s.variantes.length;
        for (const v of s.variantes) {
          if (v.imagesUrls) totalPhotos += v.imagesUrls.length;
          else if (v.imageUrl) totalPhotos++;
          if (v.prix !== undefined && v.prix !== null) {
            if (minPrice === null || v.prix < minPrice) minPrice = v.prix;
            if (maxPrice === null || v.prix > maxPrice) maxPrice = v.prix;
          }
        }
      }
    }

    return {
      totalServices,
      servicesActifs,
      totalVariantes,
      totalPhotos,
      minPrice: minPrice || 0,
      maxPrice: maxPrice || 0
    };
  });

  // Services filtrés
  readonly servicesFiltres = computed(() => {
    let list = this.services();
    const q = this.searchQuery.trim().toLowerCase();

    if (this.filtreStatut === 'ACTIF') {
      list = list.filter(s => s.statut);
    } else if (this.filtreStatut === 'INACTIF') {
      list = list.filter(s => !s.statut);
    }

    if (q) {
      list = list.filter(s => {
        const matchNom = s.nom?.toLowerCase().includes(q);
        const matchDesc = s.description?.toLowerCase().includes(q);
        const matchVar = s.variantes?.some(v => v.nom?.toLowerCase().includes(q));
        return matchNom || matchDesc || matchVar;
      });
    }

    return list;
  });

  // --- MODAL: Créer Service ---
  showCreateServiceModal = false;
  isCreatingService = false;
  newServiceData = { nom: '', description: '' };
  newServiceImage: File | null = null;
  newServicePreviewUrl: string | null = null;

  // --- MODAL: Modifier Textes Service ---
  showEditServiceModal = false;
  isUpdatingService = false;
  selectedServiceForEdit: PrestationCatalogue | null = null;
  editServiceData: ServiceSalonUpdateDto = { nom: '', description: '' };

  // --- MODAL: Image Service ---
  showImageServiceModal = false;
  isUploadingServiceImage = false;
  selectedServiceForImage: PrestationCatalogue | null = null;
  serviceImageFile: File | null = null;
  serviceImagePreviewUrl: string | null = null;

  // --- MODAL: Ajouter Variante ---
  showAddVarianteModal = false;
  isAddingVariante = false;
  parentServiceForVariante: PrestationCatalogue | null = null;
  newVarianteData: VarianteCreateDto = { nom: '', description: '', dureeMinutes: 30, prix: 5000 };
  newVarianteImageFiles: File[] = [];
  newVariantePreviewUrls: string[] = [];

  // --- MODAL: Modifier Variante ---
  showEditVarianteModal = false;
  isUpdatingVariante = false;
  selectedServiceForVarEdit: PrestationCatalogue | null = null;
  selectedVarianteForEdit: VarianteServiceDto | null = null;
  editVarianteData: VarianteUpdateDto = { nom: '', description: '', dureeMinutes: 30, prix: 0 };

  // --- MODAL: Studio Galerie Photos Variante ---
  showVarGalleryModal = false;
  selectedServiceForGallery: PrestationCatalogue | null = null;
  selectedVarianteForGallery: VarianteServiceDto | null = null;
  galleryNewFiles: File[] = [];
  galleryNewPreviews: string[] = [];
  isUploadingGallery = false;
  isProcessingPhoto = false;
  photoEnTraitementUrl: string | null = null;

  // --- MODAL: Détails / Zoom Déclinaison ---
  showDetailVarianteModal = false;
  selectedVarianteForDetail: VarianteServiceDto | null = null;
  parentServiceForDetail: PrestationCatalogue | null = null;
  activeDetailVarianteImg: string | null = null;

  ngOnInit(): void {
    this.chargerServices();
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

  chargerServices(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.managerService.listerServices(slug, this.inclureInactifs).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.services.set(res.data);

          // Synchroniser le service actif s'il est affiché
          if (this.serviceActif) {
            const refreshed = res.data.find(s => s.id === this.serviceActif!.id);
            if (refreshed) {
              this.serviceActif = refreshed;
            }
          }

          // Synchroniser la galerie si ouverte
          if (this.selectedVarianteForGallery && this.selectedServiceForGallery) {
            const refreshedParent = res.data.find(s => s.id === this.selectedServiceForGallery!.id);
            if (refreshedParent) {
              this.selectedServiceForGallery = refreshedParent;
              const refreshedVar = refreshedParent.variantes?.find(v => v.id === this.selectedVarianteForGallery!.id);
              if (refreshedVar) {
                this.selectedVarianteForGallery = refreshedVar;
              }
            }
          }

          // Synchroniser le zoom si ouvert
          if (this.selectedVarianteForDetail && this.parentServiceForDetail) {
            const updatedParent = res.data.find(s => s.id === this.parentServiceForDetail!.id);
            if (updatedParent) {
              this.parentServiceForDetail = updatedParent;
              const updatedVar = updatedParent.variantes?.find(v => v.id === this.selectedVarianteForDetail!.id);
              if (updatedVar) {
                this.selectedVarianteForDetail = updatedVar;
                const images = this.getDetailVarianteImages(updatedVar);
                if (!this.activeDetailVarianteImg || !images.includes(this.activeDetailVarianteImg)) {
                  this.activeDetailVarianteImg = images[0] || null;
                }
              }
            }
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des prestations.');
      }
    });
  }

  // --- NAVIGATION WORKSPACE ---
  ouvrirEspaceService(s: PrestationCatalogue): void {
    this.serviceActif = s;
    this.vueActive = 'espace-service';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  fermerEspaceService(): void {
    this.serviceActif = null;
    this.vueActive = 'catalogue';
  }

  // --- ACTIONS SERVICE ---
  openCreateServiceModal(): void {
    this.newServiceData = { nom: '', description: '' };
    this.newServiceImage = null;
    this.newServicePreviewUrl = null;
    this.showCreateServiceModal = true;
  }

  onNewServiceImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newServiceImage = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.newServicePreviewUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.newServiceImage);
    }
  }

  creerService(): void {
    const slug = this.slugSalon;
    if (!slug) return;

    if (!this.newServiceData.nom.trim()) {
      this.notificationService.error('Veuillez renseigner le nom du service.', 'Champs requis');
      return;
    }

    this.isCreatingService = true;
    const req: ServiceSalonCreateDto = {
      nom: this.newServiceData.nom.trim(),
      description: this.newServiceData.description?.trim() || undefined
    };

    this.managerService.creerService(slug, req, this.newServiceImage || undefined).subscribe({
      next: (res) => {
        this.isCreatingService = false;
        this.showCreateServiceModal = false;
        this.notificationService.success('Le nouveau service a été créé dans le catalogue.', 'Prestation ajoutée');
        this.chargerServices();
        if (res?.data) {
          this.ouvrirEspaceService(res.data);
        }
      },
      error: (err) => {
        this.isCreatingService = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la création du service.', 'Erreur');
      }
    });
  }

  openEditServiceModal(s: PrestationCatalogue): void {
    this.selectedServiceForEdit = s;
    this.editServiceData = { nom: s.nom, description: s.description || '' };
    this.showEditServiceModal = true;
  }

  modifierService(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForEdit) return;

    if (!this.editServiceData.nom.trim()) {
      this.notificationService.error('Le nom du service est obligatoire.', 'Champs requis');
      return;
    }

    this.isUpdatingService = true;
    this.managerService.modifierService(slug, this.selectedServiceForEdit.id, this.editServiceData).subscribe({
      next: (res) => {
        this.isUpdatingService = false;
        this.showEditServiceModal = false;
        this.notificationService.success('Informations du service mises à jour.', 'Service modifié');
        this.chargerServices();
        if (this.serviceActif && this.serviceActif.id === this.selectedServiceForEdit!.id && res?.data) {
          this.serviceActif = res.data;
        }
      },
      error: (err) => {
        this.isUpdatingService = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la mise à jour.', 'Erreur');
      }
    });
  }

  openImageServiceModal(s: PrestationCatalogue): void {
    this.selectedServiceForImage = s;
    this.serviceImageFile = null;
    this.serviceImagePreviewUrl = s.imageUrl || null;
    this.showImageServiceModal = true;
  }

  onServiceImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.serviceImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.serviceImagePreviewUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.serviceImageFile);
    }
  }

  uploadImageService(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForImage || !this.serviceImageFile) return;

    this.isUploadingServiceImage = true;
    this.managerService.uploadImageService(slug, this.selectedServiceForImage.id, this.serviceImageFile).subscribe({
      next: (res) => {
        this.isUploadingServiceImage = false;
        this.showImageServiceModal = false;
        this.notificationService.success('Photo de couverture mise à jour.', 'Image actualisée');
        this.chargerServices();
        if (this.serviceActif && this.serviceActif.id === this.selectedServiceForImage!.id && res?.data) {
          this.serviceActif = res.data;
        }
      },
      error: (err) => {
        this.isUploadingServiceImage = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors du téléversement de l’image.', 'Erreur');
      }
    });
  }

  basculerStatutService(s: PrestationCatalogue): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.managerService.basculerStatutService(slug, s.id).subscribe({
      next: (res) => {
        this.notificationService.success(`Le statut du service "${s.nom}" a été mis à jour.`, 'Statut modifié');
        this.chargerServices();
        if (this.serviceActif && this.serviceActif.id === s.id && res?.data) {
          this.serviceActif = res.data;
        }
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Impossible de modifier le statut.', 'Erreur');
      }
    });
  }

  // --- ACTIONS VARIANTES ---
  openAddVarianteModal(s: PrestationCatalogue): void {
    this.parentServiceForVariante = s;
    this.newVarianteData = { nom: '', description: '', dureeMinutes: 30, prix: 5000 };
    this.newVarianteImageFiles = [];
    this.newVariantePreviewUrls = [];
    this.showAddVarianteModal = true;
    this.cdr.detectChanges();
  }

  closeAddVarianteModal(): void {
    this.showAddVarianteModal = false;
    this.isAddingVariante = false;
    this.newVarianteData = { nom: '', description: '', dureeMinutes: 30, prix: 5000 };
    this.newVarianteImageFiles = [];
    this.newVariantePreviewUrls = [];
    this.parentServiceForVariante = null;
    this.cdr.detectChanges();
  }

  onNewVarianteFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      for (const file of files) {
        this.newVarianteImageFiles.push(file);
        const reader = new FileReader();
        reader.onload = () => {
          this.newVariantePreviewUrls.push(reader.result as string);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
      input.value = '';
    }
  }

  removeNewVariantePendingFile(index: number): void {
    this.newVarianteImageFiles.splice(index, 1);
    this.newVariantePreviewUrls.splice(index, 1);
    this.cdr.detectChanges();
  }

  ajouterVariante(): void {
    const slug = this.slugSalon;
    if (!slug || !this.parentServiceForVariante) return;

    if (!this.newVarianteData.nom.trim() || this.newVarianteData.prix < 0) {
      this.notificationService.error('Veuillez renseigner le nom et le tarif de la déclinaison.', 'Champs requis');
      return;
    }

    this.isAddingVariante = true;
    this.cdr.detectChanges();

    const filesToSend = this.newVarianteImageFiles.length > 0 ? this.newVarianteImageFiles : undefined;

    this.managerService.ajouterVariante(
      slug,
      this.parentServiceForVariante.id,
      this.newVarianteData,
      filesToSend
    ).subscribe({
      next: (res) => {
        this.isAddingVariante = false;
        this.showAddVarianteModal = false;
        this.newVarianteData = { nom: '', description: '', dureeMinutes: 30, prix: 5000 };
        this.newVarianteImageFiles = [];
        this.newVariantePreviewUrls = [];
        this.parentServiceForVariante = null;

        // Synchronisation immédiate du service actif pour un rendu instantané
        if (this.serviceActif && res?.data) {
          const currentVars = this.serviceActif.variantes || [];
          this.serviceActif = {
            ...this.serviceActif,
            variantes: [...currentVars.filter(v => v.id !== res.data.id), res.data]
          };
        }

        this.notificationService.success('La déclinaison a été ajoutée avec succès.', 'Déclinaison créée');
        this.chargerServices();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isAddingVariante = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de l’ajout de la variante.', 'Erreur');
        this.cdr.detectChanges();
      }
    });
  }

  openEditVarianteModal(s: PrestationCatalogue, v: VarianteServiceDto): void {
    this.selectedServiceForVarEdit = s;
    this.selectedVarianteForEdit = v;
    this.editVarianteData = { nom: v.nom, description: v.description || '', dureeMinutes: v.dureeMinutes, prix: v.prix };
    this.showEditVarianteModal = true;
    this.cdr.detectChanges();
  }

  modifierVariante(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForVarEdit || !this.selectedVarianteForEdit) return;

    if (!this.editVarianteData.nom.trim() || this.editVarianteData.prix < 0) {
      this.notificationService.error('Veuillez renseigner les informations de la déclinaison.', 'Champs requis');
      return;
    }

    this.isUpdatingVariante = true;
    this.cdr.detectChanges();

    this.managerService.modifierVariante(
      slug,
      this.selectedServiceForVarEdit.id,
      this.selectedVarianteForEdit.id,
      this.editVarianteData
    ).subscribe({
      next: (res) => {
        this.isUpdatingVariante = false;
        this.showEditVarianteModal = false;

        if (this.serviceActif && res?.data) {
          const currentVars = this.serviceActif.variantes || [];
          this.serviceActif = {
            ...this.serviceActif,
            variantes: currentVars.map(v => v.id === res.data.id ? res.data : v)
          };
        }

        this.notificationService.success('La déclinaison a été modifiée avec succès.', 'Déclinaison modifiée');
        this.chargerServices();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isUpdatingVariante = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la modification.', 'Erreur');
        this.cdr.detectChanges();
      }
    });
  }

  basculerStatutVariante(s: PrestationCatalogue, v: VarianteServiceDto): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.managerService.basculerStatutVariante(slug, s.id, v.id).subscribe({
      next: () => {
        this.notificationService.success(`Statut de la déclinaison "${v.nom}" modifié.`, 'Statut modifié');
        this.chargerServices();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Impossible de modifier le statut.', 'Erreur');
      }
    });
  }

  // --- STUDIO GALERIE PHOTOS VARIANTE ---
  ouvrirGalerieVariante(s: PrestationCatalogue, v: VarianteServiceDto): void {
    this.selectedServiceForGallery = s;
    this.selectedVarianteForGallery = v;
    this.galleryNewFiles = [];
    this.galleryNewPreviews = [];
    this.showVarGalleryModal = true;
  }

  fermerGalerieVariante(): void {
    this.showVarGalleryModal = false;
    this.selectedServiceForGallery = null;
    this.selectedVarianteForGallery = null;
    this.galleryNewFiles = [];
    this.galleryNewPreviews = [];
  }

  getVarGalleryImages(v?: VarianteServiceDto | null): string[] {
    const target = v || this.selectedVarianteForGallery;
    if (!target) return [];
    if (target.imagesUrls && target.imagesUrls.length > 0) {
      return target.imagesUrls;
    }
    return target.imageUrl ? [target.imageUrl] : [];
  }

  onGalleryFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      for (const file of files) {
        this.galleryNewFiles.push(file);
        const reader = new FileReader();
        reader.onload = () => {
          this.galleryNewPreviews.push(reader.result as string);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
      input.value = '';
    }
  }

  removePendingGalleryFile(index: number): void {
    this.galleryNewFiles.splice(index, 1);
    this.galleryNewPreviews.splice(index, 1);
    this.cdr.detectChanges();
  }

  ajouterPhotosALaGalerie(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForGallery || !this.selectedVarianteForGallery || this.galleryNewFiles.length === 0) return;

    this.isUploadingGallery = true;
    this.managerService.uploadImageVariante(
      slug,
      this.selectedServiceForGallery.id,
      this.selectedVarianteForGallery.id,
      this.galleryNewFiles
    ).subscribe({
      next: (res) => {
        this.isUploadingGallery = false;
        this.galleryNewFiles = [];
        this.galleryNewPreviews = [];
        if (res?.data) {
          this.selectedVarianteForGallery = res.data;
        }
        this.notificationService.success('Les nouvelles photos ont été ajoutées à la galerie avec succès.', 'Photos ajoutées');
        this.chargerServices();
      },
      error: (err) => {
        this.isUploadingGallery = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors du téléversement des photos.', 'Erreur');
      }
    });
  }

  definirCommePrincipale(imageUrl: string): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForGallery || !this.selectedVarianteForGallery) return;

    this.isProcessingPhoto = true;
    this.photoEnTraitementUrl = imageUrl;

    this.managerService.definirImagePrincipaleVariante(
      slug,
      this.selectedServiceForGallery.id,
      this.selectedVarianteForGallery.id,
      imageUrl
    ).subscribe({
      next: (res) => {
        this.isProcessingPhoto = false;
        this.photoEnTraitementUrl = null;
        if (res?.data) {
          this.selectedVarianteForGallery = res.data;
        }
        this.notificationService.success('Cette photo est désormais la photo principale de la déclinaison.', 'Photo principale définie');
        this.chargerServices();
      },
      error: (err) => {
        this.isProcessingPhoto = false;
        this.photoEnTraitementUrl = null;
        this.notificationService.error(err?.error?.message || 'Impossible de définir cette photo comme principale.', 'Erreur');
      }
    });
  }

  async supprimerPhotoExistante(imageUrl: string): Promise<void> {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForGallery || !this.selectedVarianteForGallery) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Supprimer cette photo ?',
      message: 'Voulez-vous vraiment retirer cette photo de la galerie de la déclinaison ? Cette action est irréversible.',
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.isProcessingPhoto = true;
    this.photoEnTraitementUrl = imageUrl;

    this.managerService.supprimerImageVariante(
      slug,
      this.selectedServiceForGallery.id,
      this.selectedVarianteForGallery.id,
      imageUrl
    ).subscribe({
      next: (res) => {
        this.isProcessingPhoto = false;
        this.photoEnTraitementUrl = null;
        if (res?.data) {
          this.selectedVarianteForGallery = res.data;
        }
        this.notificationService.success('La photo a été retirée de la galerie.', 'Photo supprimée');
        this.chargerServices();
      },
      error: (err) => {
        this.isProcessingPhoto = false;
        this.photoEnTraitementUrl = null;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la suppression de la photo.', 'Erreur');
      }
    });
  }

  // --- DÉTAILS / ZOOM VARIANTE ---
  openDetailVarianteModal(s: PrestationCatalogue, v: VarianteServiceDto): void {
    this.parentServiceForDetail = s;
    this.selectedVarianteForDetail = v;
    const images = this.getDetailVarianteImages(v);
    this.activeDetailVarianteImg = images.length > 0 ? images[0] : null;
    this.showDetailVarianteModal = true;
  }

  closeDetailVarianteModal(): void {
    this.showDetailVarianteModal = false;
    this.selectedVarianteForDetail = null;
    this.parentServiceForDetail = null;
    this.activeDetailVarianteImg = null;
  }

  setActiveDetailImg(url: string): void {
    this.activeDetailVarianteImg = url;
  }

  getDetailVarianteImages(v?: VarianteServiceDto | null): string[] {
    const target = v || this.selectedVarianteForDetail;
    if (!target) return [];
    if (target.imagesUrls && target.imagesUrls.length > 0) {
      return target.imagesUrls;
    }
    return target.imageUrl ? [target.imageUrl] : [];
  }

  getCurrentImageIndex(): number {
    const images = this.getDetailVarianteImages();
    if (!this.activeDetailVarianteImg || images.length === 0) return 0;
    const idx = images.indexOf(this.activeDetailVarianteImg);
    return idx >= 0 ? idx : 0;
  }

  prevDetailImg(): void {
    const imgs = this.getDetailVarianteImages();
    if (imgs.length <= 1) return;
    const idx = this.getCurrentImageIndex();
    const prevIdx = idx <= 0 ? imgs.length - 1 : idx - 1;
    this.activeDetailVarianteImg = imgs[prevIdx];
  }

  nextDetailImg(): void {
    const imgs = this.getDetailVarianteImages();
    if (imgs.length <= 1) return;
    const idx = this.getCurrentImageIndex();
    const nextIdx = idx >= imgs.length - 1 ? 0 : idx + 1;
    this.activeDetailVarianteImg = imgs[nextIdx];
  }

  // Utilitaires
  formatDevise(montant: number | undefined | null): string {
    if (montant === null || montant === undefined) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(montant);
  }

  getFourchettePrix(s: PrestationCatalogue): string {
    if (!s.variantes || s.variantes.length === 0) return 'Tarif non défini';
    const prix = s.variantes.map(v => v.prix).filter(p => p !== undefined && p !== null);
    if (prix.length === 0) return 'Tarif non défini';
    const min = Math.min(...prix);
    const max = Math.max(...prix);
    if (min === max) return this.formatDevise(min);
    return `${this.formatDevise(min)} - ${this.formatDevise(max)}`;
  }

  getFourchetteDuree(s: PrestationCatalogue): string {
    if (!s.variantes || s.variantes.length === 0) return '—';
    const durees = s.variantes.map(v => v.dureeMinutes).filter(d => d !== undefined && d !== null);
    if (durees.length === 0) return '—';
    const min = Math.min(...durees);
    const max = Math.max(...durees);
    if (min === max) return `${min} min`;
    return `${min} - ${max} min`;
  }
}
