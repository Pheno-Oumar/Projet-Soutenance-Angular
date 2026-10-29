import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  HostBinding,
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

  @HostBinding('class.drawer-open')
  get isDrawerOpen(): boolean {
    return this.isMobileMenuOpen;
  }

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
    if (this.isMobileMenuOpen && target.closest('.salon-mobile-backdrop')) {
      this.closeMobileMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
    this.closeClientDropdown();
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

  get hasMultipleRoles(): boolean {
    const context = this.authService.currentSalonContext();
    // Le changement d'espace n'apparaît que si l'utilisateur a plusieurs rôles dans CE salon
    if (context && context.slugSalon === this.slugSalon && Array.isArray(context.roles)) {
      return context.roles.length > 1;
    }
    return false;
  }

  get rolesCount(): number {
    return this.authService.currentRoles()?.length || 1;
  }

  get userDisplayName(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Mon Compte';
    return `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Mon Compte';
  }

  get userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'C';
    const first = user.prenom ? user.prenom.trim().charAt(0) : '';
    const last = user.nom ? user.nom.trim().charAt(0) : '';
    const combined = (first + last).toUpperCase();
    if (combined) return combined;
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'C';
  }

  onDropdownMouseEnter(): void {
    if (typeof window !== 'undefined' && window.innerWidth > 1024) {
      this.isClientDropdownOpen.set(true);
    }
  }

  onDropdownMouseLeave(): void {
    if (typeof window !== 'undefined' && window.innerWidth > 1024) {
      this.isClientDropdownOpen.set(false);
    }
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
    const targetSlug = this.slugSalon || this.authService.getSalonSlugForRedirect();
    this.authService.logout(targetSlug || undefined).subscribe({
      next: () => {
        if (targetSlug) {
          this.router.navigate(['/' + targetSlug]).then(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }
      },
      error: () => {
        if (targetSlug) {
          this.router.navigate(['/' + targetSlug]).then(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }
      }
    });
  }
}
