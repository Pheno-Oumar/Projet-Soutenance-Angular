import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Salon } from '../../../../shared/models';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { SafeMediaUrlPipe } from '../../../../shared/pipes/safe-media-url.pipe';

import { MatIconModule } from '@angular/material/icon';
import { SalonOuvertureStatus } from '../../state/salon-context.store';

@Component({
  selector: 'app-salon-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeMediaUrlPipe, MatIconModule],
  templateUrl: './salon-navbar.component.html',
  styleUrls: ['./salon-navbar.component.css']
})
export class SalonNavbarComponent {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  @Input() salon: Salon | null = null;
  @Input({ required: true }) slugSalon = '';
  @Input() panierCount = 0;
  @Input() montantTotal = 0;
  @Input() bookingCount = 0;
  @Input() ouvertureStatus: SalonOuvertureStatus | null = null;

  @Output() openPanier = new EventEmitter<void>();
  @Output() openBooking = new EventEmitter<void>();
  @Output() selectTab = new EventEmitter<'PRESTATIONS' | 'BOUTIQUE' | 'COIFFEURS' | 'AVIS' | 'GALERIE'>();

  isMobileMenuOpen = false;
  isMoreDropdownOpen = false;
  readonly isClientDropdownOpen = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || typeof target.closest !== 'function') {
      return;
    }
    if (!target.closest('.nav-dropdown-wrap')) {
      this.isMoreDropdownOpen = false;
    }
    if (!target.closest('.client-dropdown-wrap')) {
      this.isClientDropdownOpen.set(false);
    }
  }

  toggleMoreDropdown(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isMoreDropdownOpen = !this.isMoreDropdownOpen;
    if (this.isMoreDropdownOpen) {
      this.isClientDropdownOpen.set(false);
    }
  }

  closeMoreDropdown(): void {
    this.isMoreDropdownOpen = false;
  }

  toggleClientDropdown(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isClientDropdownOpen.update((v: boolean) => !v);
    if (this.isClientDropdownOpen()) {
      this.isMoreDropdownOpen = false;
    }
  }

  closeClientDropdown(): void {
    this.isClientDropdownOpen.set(false);
  }

  get isClient(): boolean {
    return this.authService.currentRoles().includes('CLIENT');
  }

  get userDisplayName(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Mon Compte';
    return `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Mon Compte';
  }

  get userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'C';
    const first = user.prenom ? user.prenom.charAt(0) : '';
    const last = user.nom ? user.nom.charAt(0) : '';
    return (first + last).toUpperCase() || 'C';
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  scrollToSection(sectionId: string, tabName?: 'PRESTATIONS' | 'BOUTIQUE' | 'COIFFEURS' | 'AVIS' | 'GALERIE'): void {
    this.closeMobileMenu();
    if (tabName) {
      this.selectTab.emit(tabName);
    }
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  logout(): void {
    this.closeClientDropdown();
    this.closeMobileMenu();
    this.authService.logout();
    this.router.navigate(['/' + this.slugSalon + '/login']);
  }
}
