import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SalonContextStore } from '../../vitrine/state/salon-context.store';
import { SalonBookingStore } from '../../vitrine/state/salon-booking.store';
import { AssistantChatRequest } from '../models/assistant.models';

@Injectable({ providedIn: 'root' })
export class AssistantContextService {
  private readonly router = inject(Router);
  private readonly contextStore = inject(SalonContextStore);
  private readonly bookingStore = inject(SalonBookingStore);

  readonly latitude = signal<number | undefined>(undefined);
  readonly longitude = signal<number | undefined>(undefined);

  setGeolocation(lat: number, lng: number): void {
    this.latitude.set(lat);
    this.longitude.set(lng);
  }

  buildChatContext(message: string, sessionId: string): AssistantChatRequest {
    const url = this.router.url;
    const slug = this.contextStore.currentSlug();
    const pageCourante = this.deducePage(url);
    const ressourceCouranteId = this.deduceResourceId(url);

    const bookingVariantes = this.bookingStore.selectedVariantes().map(v => v.id);

    return {
      message,
      sessionId,
      slugSalon: slug || undefined,
      pageCourante,
      ressourceCouranteId,
      latitude: this.latitude(),
      longitude: this.longitude(),
      rdvEnCours: bookingVariantes.length > 0 ? {
        varianteIds: bookingVariantes,
        date: this.bookingStore.selectedDate() || undefined,
        heure: this.bookingStore.selectedSlot()?.heureDebut || undefined
      } : undefined
    };
  }

  private deducePage(url: string): string {
    if (!url) return 'ACCUEIL';
    if (url.includes('/services/')) return 'SERVICE_DETAIL';
    if (url.includes('/services')) return 'SERVICES';
    if (url.includes('/produits/')) return 'PRODUIT_DETAIL';
    if (url.includes('/boutique')) return 'BOUTIQUE';
    if (url.includes('/realisations')) return 'REALISATIONS';
    if (url.includes('/rdv')) return 'RDV';
    if (url.includes('/panier')) return 'PANIER';
    if (url.includes('/explore')) return 'EXPLORE';
    if (url.includes('/kadys')) return 'KADYS';
    return 'ACCUEIL';
  }

  private deduceResourceId(url: string): number | undefined {
    const match = url.match(/\/(\d+)(?:\?|$)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
}
