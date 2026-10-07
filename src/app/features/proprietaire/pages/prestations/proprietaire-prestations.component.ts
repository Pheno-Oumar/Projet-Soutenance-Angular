import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProprietaireService } from '../../services/proprietaire.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  PrestationCatalogue,
  VarianteServiceDto,
  ServiceSalonCreateDto,
  ServiceSalonUpdateDto,
  VarianteCreateDto,
  VarianteUpdateDto
} from '../../../../shared/models';

@Component({
  selector: 'app-proprietaire-prestations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './proprietaire-prestations.component.html',
  styleUrl: './proprietaire-prestations.component.css'
})
export class ProprietairePrestationsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly notificationService = inject(NotificationService);

  readonly services = signal<PrestationCatalogue[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  inclureInactifs = true;

  // --- MODAL: Créer Service ---
  showCreateServiceModal = false;
  isCreatingService = false;
  newServiceData = {
    nom: '',
    description: ''
  };
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
  newVarianteData: VarianteCreateDto = {
    nom: '',
    dureeMinutes: 30,
    prix: 5000
  };
  newVarianteImage: File | null = null;
  newVariantePreviewUrl: string | null = null;

  // --- MODAL: Modifier Variante ---
  showEditVarianteModal = false;
  isUpdatingVariante = false;
  selectedServiceForVarEdit: PrestationCatalogue | null = null;
  selectedVarianteForEdit: VarianteServiceDto | null = null;
  editVarianteData: VarianteUpdateDto = { nom: '', dureeMinutes: 30, prix: 0 };

  // --- MODAL: Image Variante ---
  showImageVarianteModal = false;
  isUploadingVarImage = false;
  varImageFile: File | null = null;
  varImagePreviewUrl: string | null = null;

  // --- MODAL: Détails du Service & ses Variantes ---
  showDetailServiceModal = false;
  selectedServiceForDetail: PrestationCatalogue | null = null;
  isLoadingDetail = false;

  ngOnInit(): void {
    this.chargerServices();
  }

  openDetailServiceModal(s: PrestationCatalogue): void {
    this.selectedServiceForDetail = s;
    this.showDetailServiceModal = true;
    this.rafraichirDetailService(s.id);
  }

  rafraichirDetailService(serviceId: number): void {
    const slug = this.slugSalon;
    if (!slug) return;
    this.isLoadingDetail = true;
    this.proprietaireService.getService(slug, serviceId).subscribe({
      next: (res) => {
        this.isLoadingDetail = false;
        if (res?.data) {
          this.selectedServiceForDetail = res.data;
        }
      },
      error: () => {
        this.isLoadingDetail = false;
      }
    });
  }

  closeDetailServiceModal(): void {
    this.showDetailServiceModal = false;
    this.selectedServiceForDetail = null;
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

    this.proprietaireService.listerServices(slug, this.inclureInactifs).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.data) {
          this.services.set(res.data);
          if (this.selectedServiceForDetail) {
            this.rafraichirDetailService(this.selectedServiceForDetail.id);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Erreur lors du chargement des prestations.');
      }
    });
  }

  formatDevise(val: number | undefined): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(val || 0);
  }

  // --- SERVICE CREATION ---
  openCreateServiceModal(): void {
    this.newServiceData = {
      nom: '',
      description: ''
    };
    this.newServiceImage = null;
    this.newServicePreviewUrl = null;
    this.showCreateServiceModal = true;
  }

  onNewServiceImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newServiceImage = input.files[0];
      const reader = new FileReader();
      reader.onload = () => { this.newServicePreviewUrl = reader.result as string; };
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

    const payload: ServiceSalonCreateDto = {
      nom: this.newServiceData.nom.trim(),
      description: this.newServiceData.description.trim() || undefined,
      variantes: []
    };

    this.isCreatingService = true;
    this.proprietaireService.creerService(slug, payload, this.newServiceImage || undefined).subscribe({
      next: () => {
        this.isCreatingService = false;
        this.showCreateServiceModal = false;
        this.newServiceData = { nom: '', description: '' };
        this.newServiceImage = null;
        this.newServicePreviewUrl = null;
        this.notificationService.success('Le service a été créé avec succès. Vous pouvez maintenant y ajouter des formules et variantes.', 'Service créé');
        this.chargerServices();
      },
      error: (err) => {
        this.isCreatingService = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la création du service.', 'Erreur');
      }
    });
  }

  // --- SERVICE EDIT ---
  openEditServiceModal(s: PrestationCatalogue): void {
    this.selectedServiceForEdit = s;
    this.editServiceData = { nom: s.nom, description: s.description || '' };
    this.showEditServiceModal = true;
  }

  modifierService(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForEdit) return;

    if (!this.editServiceData.nom.trim()) {
      this.notificationService.error('Le nom du service est obligatoire.', 'Champ requis');
      return;
    }

    this.isUpdatingService = true;
    this.proprietaireService.modifierService(slug, this.selectedServiceForEdit.id, this.editServiceData).subscribe({
      next: () => {
        this.isUpdatingService = false;
        this.showEditServiceModal = false;
        this.notificationService.success('Le service a été mis à jour avec succès.', 'Service mis à jour');
        this.chargerServices();
      },
      error: (err) => {
        this.isUpdatingService = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la mise à jour du service.', 'Erreur');
      }
    });
  }

  // --- SERVICE IMAGE ---
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
      reader.onload = () => { this.serviceImagePreviewUrl = reader.result as string; };
      reader.readAsDataURL(this.serviceImageFile);
    }
  }

  uploadImageService(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForImage || !this.serviceImageFile) return;

    this.isUploadingServiceImage = true;
    this.proprietaireService.uploadImageService(slug, this.selectedServiceForImage.id, this.serviceImageFile).subscribe({
      next: () => {
        this.isUploadingServiceImage = false;
        this.showImageServiceModal = false;
        this.notificationService.success('L’image du service a été mise à jour en WebP sur Cloudinary.', 'Image actualisée');
        this.chargerServices();
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

    this.proprietaireService.basculerStatutService(slug, s.id).subscribe({
      next: () => {
        this.notificationService.success(`Le statut du service "${s.nom}" a été mis à jour.`, 'Statut modifié');
        this.chargerServices();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Impossible de modifier le statut.', 'Erreur');
      }
    });
  }

  // --- VARIANTE AJOUT ---
  openAddVarianteModal(s: PrestationCatalogue): void {
    this.parentServiceForVariante = s;
    this.newVarianteData = { nom: '', dureeMinutes: 30, prix: 5000 };
    this.newVarianteImage = null;
    this.newVariantePreviewUrl = null;
    this.showAddVarianteModal = true;
  }

  onNewVarianteImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newVarianteImage = input.files[0];
      const reader = new FileReader();
      reader.onload = () => { this.newVariantePreviewUrl = reader.result as string; };
      reader.readAsDataURL(this.newVarianteImage);
    }
  }

  ajouterVariante(): void {
    const slug = this.slugSalon;
    if (!slug || !this.parentServiceForVariante) return;

    if (!this.newVarianteData.nom.trim() || this.newVarianteData.prix < 0) {
      this.notificationService.error('Veuillez renseigner un nom et un prix valides pour la variante.', 'Champs requis');
      return;
    }

    this.isAddingVariante = true;
    this.proprietaireService.ajouterVariante(
      slug,
      this.parentServiceForVariante.id,
      this.newVarianteData,
      this.newVarianteImage || undefined
    ).subscribe({
      next: () => {
        this.isAddingVariante = false;
        this.showAddVarianteModal = false;
        this.notificationService.success('La variante a été ajoutée avec succès.', 'Variante ajoutée');
        this.chargerServices();
      },
      error: (err) => {
        this.isAddingVariante = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de l’ajout de la variante.', 'Erreur');
      }
    });
  }

  // --- VARIANTE EDIT ---
  openEditVarianteModal(s: PrestationCatalogue, v: VarianteServiceDto): void {
    this.selectedServiceForVarEdit = s;
    this.selectedVarianteForEdit = v;
    this.editVarianteData = { nom: v.nom, dureeMinutes: v.dureeMinutes, prix: v.prix };
    this.showEditVarianteModal = true;
  }

  modifierVariante(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForVarEdit || !this.selectedVarianteForEdit) return;

    if (!this.editVarianteData.nom.trim() || this.editVarianteData.prix < 0) {
      this.notificationService.error('Veuillez renseigner les informations de la variante.', 'Champs requis');
      return;
    }

    this.isUpdatingVariante = true;
    this.proprietaireService.modifierVariante(
      slug,
      this.selectedServiceForVarEdit.id,
      this.selectedVarianteForEdit.id,
      this.editVarianteData
    ).subscribe({
      next: () => {
        this.isUpdatingVariante = false;
        this.showEditVarianteModal = false;
        this.notificationService.success('La variante a été modifiée avec succès.', 'Variante modifiée');
        this.chargerServices();
      },
      error: (err) => {
        this.isUpdatingVariante = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors de la modification de la variante.', 'Erreur');
      }
    });
  }

  // --- VARIANTE IMAGE ---
  openImageVarianteModal(s: PrestationCatalogue, v: VarianteServiceDto): void {
    this.selectedServiceForVarEdit = s;
    this.selectedVarianteForEdit = v;
    this.varImageFile = null;
    this.varImagePreviewUrl = v.imageUrl || null;
    this.showImageVarianteModal = true;
  }

  onVarImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.varImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => { this.varImagePreviewUrl = reader.result as string; };
      reader.readAsDataURL(this.varImageFile);
    }
  }

  uploadImageVariante(): void {
    const slug = this.slugSalon;
    if (!slug || !this.selectedServiceForVarEdit || !this.selectedVarianteForEdit || !this.varImageFile) return;

    this.isUploadingVarImage = true;
    this.proprietaireService.uploadImageVariante(
      slug,
      this.selectedServiceForVarEdit.id,
      this.selectedVarianteForEdit.id,
      this.varImageFile
    ).subscribe({
      next: () => {
        this.isUploadingVarImage = false;
        this.showImageVarianteModal = false;
        this.notificationService.success('L’image de la variante a été mise à jour.', 'Image actualisée');
        this.chargerServices();
      },
      error: (err) => {
        this.isUploadingVarImage = false;
        this.notificationService.error(err?.error?.message || 'Erreur lors du téléversement de l’image.', 'Erreur');
      }
    });
  }

  basculerStatutVariante(s: PrestationCatalogue, v: VarianteServiceDto): void {
    const slug = this.slugSalon;
    if (!slug) return;

    this.proprietaireService.basculerStatutVariante(slug, s.id, v.id).subscribe({
      next: () => {
        this.notificationService.success(`Le statut de la variante "${v.nom}" a été mis à jour.`, 'Statut modifié');
        this.chargerServices();
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Impossible de modifier le statut.', 'Erreur');
      }
    });
  }
}
