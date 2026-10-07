import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TypeRoleSalon, TypeRolePlateforme } from '../models/role-salon.enum';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  getRoles(): string[] {
    return this.authService.currentRoles();
  }

  hasRole(role: string): boolean {
    const roles = this.getRoles();
    return roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const currentRoles = this.getRoles();
    return roles.some((r) => currentRoles.includes(r));
  }

  hasRoleInSalon(slugSalon: string, role: string): boolean {
    const context = this.authService.currentSalonContext();
    if (!context || context.slugSalon !== slugSalon) {
      return false;
    }
    return context.roles.includes(role);
  }

  isAdminPlateforme(): boolean {
    const user = this.authService.currentUser();
    return (
      user?.rolePlateforme === TypeRolePlateforme.ADMIN_SYSTEME ||
      this.hasRole(TypeRolePlateforme.ADMIN_SYSTEME)
    );
  }

  getDefaultRouteForRole(role: string, slugSalon?: string): string {
    const slug = slugSalon || this.authService.currentSalonContext()?.slugSalon;

    switch (role) {
      case TypeRolePlateforme.ADMIN_SYSTEME:
        return '/admin-plateforme';
      case TypeRoleSalon.PROPRIETAIRE:
        return slug ? `/${slug}/proprietaire` : '/espace-selection';
      case TypeRoleSalon.MANAGER:
        return slug ? `/${slug}/manager` : '/espace-selection';
      case TypeRoleSalon.COIFFEUR:
        return slug ? `/${slug}/coiffeur` : '/espace-selection';
      case TypeRoleSalon.RECEPTIONNISTE:
        return slug ? `/${slug}/receptionniste` : '/espace-selection';
      case TypeRoleSalon.RESPONSABLE_STOCK:
        return slug ? `/${slug}/responsable-stock` : '/espace-selection';
      case TypeRoleSalon.COMPTABLE:
        return slug ? `/${slug}/comptabilite` : '/espace-selection';
      case TypeRoleSalon.CLIENT:
        return slug ? `/${slug}/client` : '/client';
      default:
        return '/espace-selection';
    }
  }

  navigateToDefaultSpace(): void {
    if (this.isAdminPlateforme()) {
      this.router.navigate(['/admin-plateforme']);
      return;
    }

    const roles = this.getRoles();
    const slug = this.authService.currentSalonContext()?.slugSalon;

    if (roles.length === 1) {
      const route = this.getDefaultRouteForRole(roles[0], slug);
      this.router.navigateByUrl(route);
    } else if (roles.length > 1) {
      if (slug && roles.includes(TypeRoleSalon.CLIENT) && !roles.some((r) => r !== TypeRoleSalon.CLIENT)) {
        this.router.navigateByUrl(`/${slug}/client`);
      } else {
        this.router.navigate(['/espace-selection']);
      }
    } else {
      this.authService.navigateToLogin();
    }
  }
}
