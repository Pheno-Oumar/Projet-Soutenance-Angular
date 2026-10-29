import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SalonBookingStore } from '../../state/salon-booking.store';
import { SalonContextStore } from '../../state/salon-context.store';
import { AuthGateService } from '../../state/auth-gate.service';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-booking-drawer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './booking-drawer.component.html',
  styleUrls: ['./booking-drawer.component.css']
})
export class BookingDrawerComponent {
  readonly bookingStore = inject(SalonBookingStore);
  readonly contextStore = inject(SalonContextStore);
  readonly authGateService = inject(AuthGateService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isOpen = computed(() => this.bookingStore.isDrawerOpen());
  readonly selectedVariantes = this.bookingStore.selectedVariantes;
  readonly count = this.bookingStore.count;
  readonly totalPrix = this.bookingStore.totalPrix;
  readonly totalDureeMinutes = this.bookingStore.totalDureeMinutes;

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  get salonNom(): string {
    return this.contextStore.salon()?.nom || 'Le Salon';
  }

  close(): void {
    this.bookingStore.closeDrawer();
  }

  removeVariante(id: number): void {
    this.bookingStore.removeVariante(id);
  }

  formatDuree(minutes: number): string {
    if (!minutes || minutes <= 0) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins < 10 ? '0' : ''}${mins}m`;
  }

  goToServices(): void {
    this.close();
    this.router.navigate(['/' + this.slugSalon + '/services']);
  }

  proceedToBooking(): void {
    this.close();
    // Persister dans le local storage invité pour ne rien perdre
    this.bookingStore.persistToGuest(this.slugSalon);

    // Naviguer directement vers le tunnel de sélection de date/créneau
    this.router.navigate(['/' + this.slugSalon + '/rdv']);
  }

  clearAll(): void {
    this.bookingStore.clearBooking();
  }
}
