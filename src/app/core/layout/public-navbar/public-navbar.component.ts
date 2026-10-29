import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { PanierService } from '../../services/panier.service';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './public-navbar.component.html',
  styleUrls: ['./public-navbar.component.css']
})
export class PublicNavbarComponent {
  readonly authService = inject(AuthService);
  readonly panierService = inject(PanierService);
  private readonly router = inject(Router);

  isMobileMenuOpen = false;

  get isClient(): boolean {
    const roles = this.authService.currentRoles();
    return roles.includes('CLIENT');
  }

  get userDisplayName(): string {
    const user = this.authService.currentUser();
    return user ? user.prenom : 'Mon Compte';
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/explore']);
      },
      error: () => {
        this.router.navigate(['/explore']);
      }
    });
  }
}
