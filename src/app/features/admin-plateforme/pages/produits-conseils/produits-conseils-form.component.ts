import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProduitsConseilsService } from '../../services/produits-conseils.service';
import {
  ProduitConseil,
  ProduitConseilDto,
  EtapeRoutine,
  ETAPE_ROUTINE_CONFIG,
  TYPE_CHEVEUX_OPTIONS,
  POROSITE_OPTIONS,
  TEXTURE_OPTIONS,
  ETAT_CHEVEUX_OPTIONS,
  CUIR_CHEVELU_OPTIONS,
  TypeCheveux,
  PorositeCheveux,
  TextureCheveux,
  EtatCheveux,
  CuirChevelu
} from '../../../../shared/models/produit-conseil.models';

@Component({
  selector: 'app-produits-conseils-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  templateUrl: './produits-conseils-form.component.html',
  styleUrl: './produits-conseils-form.component.css'
})
export class ProduitsConseilsFormComponent implements OnInit {
  private readonly service = inject(ProduitsConseilsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() editProduit?: ProduitConseil | null = null;
  @Input() isModalMode = false;
  @Output() enregistre = new EventEmitter<ProduitConseil>();
  @Output() annule = new EventEmitter<void>();

  readonly routineConfig = ETAPE_ROUTINE_CONFIG;
  readonly typeCheveuxOptions = TYPE_CHEVEUX_OPTIONS;
  readonly porositeOptions = POROSITE_OPTIONS;
  readonly textureOptions = TEXTURE_OPTIONS;
  readonly etatCheveuxOptions = ETAT_CHEVEUX_OPTIONS;
  readonly cuirCheveluOptions = CUIR_CHEVELU_OPTIONS;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Form State
  productId: number | null = null;
  nom = '';
  marque = '';
  description = '';
  modeUtilisation = '';
  imageUrl = '';
  etapeRoutine: EtapeRoutine = 'LAVAGE';
  actif = true;

  alternativeNaturelleNom = '';
  alternativeNaturelleIngredients = '';
  alternativeNaturelleRecette = '';

  selectedTypes = new Set<TypeCheveux>();
  selectedPorosites = new Set<PorositeCheveux>();
  selectedTextures = new Set<TextureCheveux>();
  selectedEtats = new Set<EtatCheveux>();
  selectedCuirs = new Set<CuirChevelu>();

  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  ngOnInit(): void {
    if (this.editProduit) {
      this.populateForm(this.editProduit);
    } else {
      const idParam = this.route.snapshot.paramMap.get('id');
      if (idParam) {
        this.productId = Number(idParam);
        this.chargerProduit(this.productId);
      }
    }
  }

  chargerProduit(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.service.getById(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.populateForm(res.data);
        } else {
          this.errorMessage.set(res.message || 'Impossible de charger le produit.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Erreur lors du chargement du produit.');
        this.isLoading.set(false);
      }
    });
  }

  populateForm(p: ProduitConseil): void {
    this.productId = p.id;
    this.nom = p.nom;
    this.marque = p.marque || '';
    this.description = p.description || '';
    this.modeUtilisation = p.modeUtilisation || '';
    this.imageUrl = p.imageUrl || '';
    this.imagePreviewUrl = p.imageUrl || null;
    this.etapeRoutine = p.etapeRoutine;
    this.actif = p.actif;
    this.alternativeNaturelleNom = p.alternativeNaturelleNom || '';
    this.alternativeNaturelleIngredients = p.alternativeNaturelleIngredients || '';
    this.alternativeNaturelleRecette = p.alternativeNaturelleRecette || '';

    this.selectedTypes = new Set(p.typesCheveuxCibles || []);
    this.selectedPorosites = new Set(p.porositesCibles || []);
    this.selectedTextures = new Set(p.texturesCibles || []);
    this.selectedEtats = new Set(p.etatsCheveuxCibles || []);
    this.selectedCuirs = new Set(p.cuirsChevelusCibles || []);
  }

  // Toggles
  toggleType(val: TypeCheveux): void {
    if (this.selectedTypes.has(val)) this.selectedTypes.delete(val);
    else this.selectedTypes.add(val);
  }

  togglePorosite(val: PorositeCheveux): void {
    if (this.selectedPorosites.has(val)) this.selectedPorosites.delete(val);
    else this.selectedPorosites.add(val);
  }

  toggleTexture(val: TextureCheveux): void {
    if (this.selectedTextures.has(val)) this.selectedTextures.delete(val);
    else this.selectedTextures.add(val);
  }

  toggleEtat(val: EtatCheveux): void {
    if (this.selectedEtats.has(val)) this.selectedEtats.delete(val);
    else this.selectedEtats.add(val);
  }

  toggleCuir(val: CuirChevelu): void {
    if (this.selectedCuirs.has(val)) this.selectedCuirs.delete(val);
    else this.selectedCuirs.add(val);
  }

  // File Upload
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedImageFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  supprimerImage(): void {
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    this.imageUrl = '';
  }

  onUrlChange(): void {
    if (this.imageUrl.trim()) {
      this.imagePreviewUrl = this.imageUrl.trim();
      this.selectedImageFile = null;
    }
  }

  sauvegarder(): void {
    if (!this.nom.trim()) {
      this.errorMessage.set('Le nom du produit est obligatoire.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const dto: ProduitConseilDto = {
      nom: this.nom.trim(),
      marque: this.marque.trim() || undefined,
      description: this.description.trim() || undefined,
      modeUtilisation: this.modeUtilisation.trim() || undefined,
      imageUrl: this.selectedImageFile ? undefined : (this.imageUrl.trim() || undefined),
      etapeRoutine: this.etapeRoutine,
      cuirsChevelusCibles: Array.from(this.selectedCuirs),
      etatsCheveuxCibles: Array.from(this.selectedEtats),
      porositesCibles: Array.from(this.selectedPorosites),
      typesCheveuxCibles: Array.from(this.selectedTypes),
      texturesCibles: Array.from(this.selectedTextures),
      alternativeNaturelleNom: this.alternativeNaturelleNom.trim() || undefined,
      alternativeNaturelleIngredients: this.alternativeNaturelleIngredients.trim() || undefined,
      alternativeNaturelleRecette: this.alternativeNaturelleRecette.trim() || undefined,
      actif: this.actif
    };

    if (this.productId) {
      // Modification
      this.service.modifier(this.productId, dto).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            if (this.selectedImageFile) {
              this.uploadImageAndFinish(res.data.id, res.data);
            } else {
              this.terminerEnregistrement(res.data);
            }
          } else {
            this.errorMessage.set(res.message || 'Erreur lors de la modification.');
            this.isSaving.set(false);
          }
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Erreur lors de la modification.');
          this.isSaving.set(false);
        }
      });
    } else {
      // Création
      this.service.creer(dto).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            if (this.selectedImageFile) {
              this.uploadImageAndFinish(res.data.id, res.data);
            } else {
              this.terminerEnregistrement(res.data);
            }
          } else {
            this.errorMessage.set(res.message || 'Erreur lors de la création.');
            this.isSaving.set(false);
          }
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Erreur lors de la création.');
          this.isSaving.set(false);
        }
      });
    }
  }

  private uploadImageAndFinish(id: number, produit: ProduitConseil): void {
    if (!this.selectedImageFile) {
      this.terminerEnregistrement(produit);
      return;
    }
    this.service.uploadImage(id, this.selectedImageFile).subscribe({
      next: (uploadRes) => {
        this.terminerEnregistrement(uploadRes.data || produit);
      },
      error: () => {
        // Enregistrement OK même si upload image échoue
        this.terminerEnregistrement(produit);
      }
    });
  }

  private terminerEnregistrement(produit: ProduitConseil): void {
    this.isSaving.set(false);
    this.enregistre.emit(produit);
    if (!this.isModalMode) {
      this.router.navigate(['/admin-plateforme/produits-conseils']);
    }
  }

  annuler(): void {
    this.annule.emit();
    if (!this.isModalMode) {
      this.router.navigate(['/admin-plateforme/produits-conseils']);
    }
  }
}
