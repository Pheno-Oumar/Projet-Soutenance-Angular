import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { GuestStorageService, PendingBooking } from '../../../core/services/guest-storage.service';
import { CreneauDisponible } from '../../../shared/models';

export interface SelectedBookingVariante {
  id: number;
  serviceId?: number;
  serviceNom: string;
  varianteNom: string;
  dureeMinutes: number;
  prix: number;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SalonBookingStore {
  private readonly guestStorage = inject(GuestStorageService);

  readonly selectedVariantes = signal<SelectedBookingVariante[]>([]);
  readonly selectedCoiffeurId = signal<number | null>(null);
  readonly selectedCoiffeurNom = signal<string | null>(null);
  readonly selectedDate = signal<string | null>(null);
  readonly selectedSlot = signal<CreneauDisponible | null>(null);
  readonly notes = signal<string>('');
  readonly isDrawerOpen = signal<boolean>(false);

  // Valeurs calculées
  readonly count = computed(() => this.selectedVariantes().length);
  readonly hasItems = computed(() => this.selectedVariantes().length > 0);
  readonly totalPrix = computed(() =>
    this.selectedVariantes().reduce((acc, curr) => acc + (curr.prix || 0), 0)
  );
  readonly totalDureeMinutes = computed(() =>
    this.selectedVariantes().reduce((acc, curr) => acc + (curr.dureeMinutes || 0), 0)
  );

  /**
   * Vérifie si une variante est actuellement sélectionnée
   */
  isVarianteSelected(varianteId: number): boolean {
    return this.selectedVariantes().some((v) => v.id === varianteId);
  }

  /**
   * Ajoute une prestation au panier de rendez-vous
   */
  addVariante(v: SelectedBookingVariante): void {
    if (!this.isVarianteSelected(v.id)) {
      this.selectedVariantes.update((list) => [...list, v]);
    }
  }

  /**
   * Retire une variante du panier de rendez-vous
   */
  removeVariante(varianteId: number): void {
    this.selectedVariantes.update((list) => list.filter((v) => v.id !== varianteId));
    if (this.selectedVariantes().length === 0) {
      this.selectedSlot.set(null);
    }
  }

  /**
   * Bascule la sélection d'une variante
   */
  toggleVariante(v: SelectedBookingVariante): boolean {
    if (this.isVarianteSelected(v.id)) {
      this.removeVariante(v.id);
      return false;
    } else {
      this.addVariante(v);
      return true;
    }
  }

  setCoiffeur(id: number | null, nom: string | null = null): void {
    this.selectedCoiffeurId.set(id);
    this.selectedCoiffeurNom.set(nom);
  }

  setDateAndSlot(date: string, slot: CreneauDisponible | null): void {
    this.selectedDate.set(date);
    this.selectedSlot.set(slot);
    if (slot && slot.coiffeurId) {
      this.selectedCoiffeurId.set(slot.coiffeurId);
      this.selectedCoiffeurNom.set(slot.coiffeurNom);
    }
  }

  setNotes(n: string): void {
    this.notes.set(n);
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((v) => !v);
  }

  clearBooking(): void {
    this.selectedVariantes.set([]);
    this.selectedCoiffeurId.set(null);
    this.selectedCoiffeurNom.set(null);
    this.selectedDate.set(null);
    this.selectedSlot.set(null);
    this.notes.set('');
    this.isDrawerOpen.set(false);
    this.guestStorage.viderReservationEnCours();
  }

  /**
   * Persiste la réservation courante dans le stockage invité
   */
  persistToGuest(slugSalon: string): void {
    if (this.selectedVariantes().length === 0) return;

    let dateHeureIso = '';
    if (this.selectedDate() && this.selectedSlot()) {
      const timeParts = this.selectedSlot()!.heureDebut.split(':');
      const hh = (timeParts[0] || '00').padStart(2, '0');
      const mm = (timeParts[1] || '00').padStart(2, '0');
      const ss = (timeParts[2] || '00').padStart(2, '0');
      dateHeureIso = `${this.selectedDate()}T${hh}:${mm}:${ss}`;
    }

    const booking: PendingBooking = {
      slugSalon,
      dateHeure: dateHeureIso,
      varianteIds: this.selectedVariantes().map((v) => v.id),
      coiffeurId: this.selectedCoiffeurId() || undefined,
      notes: this.notes() || undefined
    };

    this.guestStorage.sauvegarderReservationEnCours(booking);
  }
}
