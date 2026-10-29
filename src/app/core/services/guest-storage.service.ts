import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
import { NotificationService } from './notification.service';

export interface GuestCoiffeurFavori {
  slugSalon: string;
  coiffeurId: number;
}

export interface PendingBooking {
  slugSalon: string;
  dateHeure: string;
  varianteIds: number[];
  coiffeurId?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GuestStorageService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly baseUrl = environment.apiUrl;

  private readonly KEY_FAV_SALONS = 'hair_style_guest_fav_salons';
  private readonly KEY_FAV_COIFFEURS = 'hair_style_guest_fav_coiffeurs';
  private readonly KEY_LIKES_KADYS = 'hair_style_guest_likes_kadys';
  private readonly KEY_RECENT_SALONS = 'hair_style_recent_salons';
  private readonly KEY_PENDING_BOOKING = 'hair_style_pending_booking';

  // Signals for instant UI responsiveness
  readonly localFavSalons = signal<string[]>(this.loadFromStorage<string[]>(this.KEY_FAV_SALONS, []));
  readonly localLikesKadys = signal<number[]>(this.loadFromStorage<number[]>(this.KEY_LIKES_KADYS, []));
  readonly recentSalons = signal<string[]>(this.loadFromStorage<string[]>(this.KEY_RECENT_SALONS, []));

  private loadFromStorage<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private saveToStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors
    }
  }

  // ==========================================
  // 1. SALONS FAVORIS HORS-LIGNE
  // ==========================================

  isSalonFavori(slugSalon: string): boolean {
    return this.localFavSalons().includes(slugSalon);
  }

  toggleSalonFavori(slugSalon: string): boolean {
    const current = [...this.localFavSalons()];
    const index = current.indexOf(slugSalon);
    let isFav = false;

    if (index >= 0) {
      current.splice(index, 1);
      isFav = false;
    } else {
      current.push(slugSalon);
      isFav = true;
    }

    this.localFavSalons.set(current);
    this.saveToStorage(this.KEY_FAV_SALONS, current);
    return isFav;
  }

  // ==========================================
  // 2. LIKES KADY'S HORS-LIGNE
  // ==========================================

  isKadysLiked(realisationId: number): boolean {
    return this.localLikesKadys().includes(realisationId);
  }

  toggleKadysLike(realisationId: number): boolean {
    const current = [...this.localLikesKadys()];
    const index = current.indexOf(realisationId);
    let liked = false;

    if (index >= 0) {
      current.splice(index, 1);
      liked = false;
    } else {
      current.push(realisationId);
      liked = true;
    }

    this.localLikesKadys.set(current);
    this.saveToStorage(this.KEY_LIKES_KADYS, current);
    return liked;
  }

  // ==========================================
  // 3. SALONS RÉCEMMENT CONSULTÉS
  // ==========================================

  enregistrerConsultationSalon(slugSalon: string): void {
    let current = [...this.recentSalons()].filter((s) => s !== slugSalon);
    current.unshift(slugSalon);
    if (current.length > 8) {
      current = current.slice(0, 8);
    }
    this.recentSalons.set(current);
    this.saveToStorage(this.KEY_RECENT_SALONS, current);
  }

  // ==========================================
  // 4. RÉSERVATION EN COURS (PENDING BOOKING)
  // ==========================================

  sauvegarderReservationEnCours(booking: PendingBooking): void {
    this.saveToStorage(this.KEY_PENDING_BOOKING, booking);
  }

  recupererReservationEnCours(): PendingBooking | null {
    return this.loadFromStorage<PendingBooking | null>(this.KEY_PENDING_BOOKING, null);
  }

  viderReservationEnCours(): void {
    try {
      localStorage.removeItem(this.KEY_PENDING_BOOKING);
    } catch {}
  }

  // ==========================================
  // 5. SYNCHRONISATION AUTOMATIQUE SUR CONNEXION
  // ==========================================

  /**
   * Synchronise l'ensemble des données d'un visiteur vers le backend une fois connecté :
   * - Favoris salons
   * - Likes Kady's
   */
  synchroniserDonneesInviteVersBackend(): void {
    if (!this.authService.isAuthenticated()) return;

    const salons = this.loadFromStorage<string[]>(this.KEY_FAV_SALONS, []);
    const likes = this.loadFromStorage<number[]>(this.KEY_LIKES_KADYS, []);

    // 1. Sync Favoris Salons
    if (salons.length > 0) {
      const calls = salons.map((slug) =>
        this.http.post(`${this.baseUrl}/client/favoris/${slug}`, {}).pipe(catchError(() => of(null)))
      );
      forkJoin(calls).subscribe(() => {
        try {
          localStorage.removeItem(this.KEY_FAV_SALONS);
          this.localFavSalons.set([]);
        } catch {}
      });
    }

    // 2. Sync Likes Kady's
    if (likes.length > 0) {
      const calls = likes.map((id) =>
        this.http.post(`${this.baseUrl}/kadys/${id}/like`, {}).pipe(catchError(() => of(null)))
      );
      forkJoin(calls).subscribe(() => {
        try {
          localStorage.removeItem(this.KEY_LIKES_KADYS);
          this.localLikesKadys.set([]);
        } catch {}
      });
    }
  }
}
