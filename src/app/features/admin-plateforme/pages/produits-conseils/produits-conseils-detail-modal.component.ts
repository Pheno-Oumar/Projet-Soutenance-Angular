import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  ProduitConseil,
  ETAPE_ROUTINE_CONFIG,
  TYPE_CHEVEUX_OPTIONS,
  POROSITE_OPTIONS,
  TEXTURE_OPTIONS,
  ETAT_CHEVEUX_OPTIONS,
  CUIR_CHEVELU_OPTIONS
} from '../../../../shared/models/produit-conseil.models';

@Component({
  selector: 'app-produits-conseils-detail-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './produits-conseils-detail-modal.component.html',
  styleUrl: './produits-conseils-detail-modal.component.css'
})
export class ProduitsConseilsDetailModalComponent {
  @Input({ required: true }) produit!: ProduitConseil;
  @Output() fermer = new EventEmitter<void>();
  @Output() editer = new EventEmitter<ProduitConseil>();

  readonly routineConfig = ETAPE_ROUTINE_CONFIG;

  getEtapeInfo(etape: string) {
    return this.routineConfig[etape as keyof typeof this.routineConfig] || {
      label: etape,
      description: '',
      badgeClass: 'badge-default'
    };
  }

  getTypeLabel(value: string): string {
    return TYPE_CHEVEUX_OPTIONS.find((o) => o.value === value)?.label || value;
  }

  getPorositeLabel(value: string): string {
    return POROSITE_OPTIONS.find((o) => o.value === value)?.label || value;
  }

  getTextureLabel(value: string): string {
    return TEXTURE_OPTIONS.find((o) => o.value === value)?.label || value;
  }

  getEtatLabel(value: string): string {
    return ETAT_CHEVEUX_OPTIONS.find((o) => o.value === value)?.label || value;
  }

  getCuirLabel(value: string): string {
    return CUIR_CHEVELU_OPTIONS.find((o) => o.value === value)?.label || value;
  }
}
