import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthGateService } from '../../state/auth-gate.service';
import { SalonContextStore } from '../../state/salon-context.store';
import { SalonBookingStore } from '../../state/salon-booking.store';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';

@Component({
  selector: 'app-auth-gate-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, SafeMediaUrlPipe],
  templateUrl: './auth-gate-modal.component.html',
  styleUrls: ['./auth-gate-modal.component.css']
})
export class AuthGateModalComponent {
  readonly authGateService = inject(AuthGateService);
  readonly contextStore = inject(SalonContextStore);
  readonly bookingStore = inject(SalonBookingStore);
  private readonly router = inject(Router);

  readonly isOpen = computed(() => this.authGateService.isOpen());
  readonly options = computed(() => this.authGateService.options());
  readonly salon = this.contextStore.salon;

  get slugSalon(): string {
    return this.contextStore.currentSlug();
  }

  close(): void {
    this.authGateService.close();
  }

  goToLogin(): void {
    // 1. Sauvegarder dans le stockage invité pour préserver la sélection
    this.bookingStore.persistToGuest(this.slugSalon);
    this.close();

    const redirectPath = this.options()?.redirectUrl || `/${this.slugSalon}/rdv`;
    this.router.navigate(['/' + this.slugSalon + '/login'], {
      queryParams: { redirect: redirectPath }
    });
  }

  goToRegister(): void {
    // 1. Sauvegarder dans le stockage invité pour préserver la sélection
    this.bookingStore.persistToGuest(this.slugSalon);
    this.close();

    const redirectPath = this.options()?.redirectUrl || `/${this.slugSalon}/rdv`;
    this.router.navigate(['/' + this.slugSalon + '/register'], {
      queryParams: { redirect: redirectPath }
    });
  }
}
