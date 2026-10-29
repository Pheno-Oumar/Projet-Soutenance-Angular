import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';

export const guestGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const roleService = inject(RoleService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Already logged in: redirect to his space
  if (roleService.isAdminPlateforme()) {
    return router.createUrlTree(['/admin-plateforme']);
  }

  const slug =
    route.paramMap.get('slugSalon') ||
    route.parent?.paramMap.get('slugSalon') ||
    authService.currentSalonContext()?.slugSalon;

  const roles = roleService.getRoles();
  if (roles.length === 1) {
    return router.createUrlTree([roleService.getDefaultRouteForRole(roles[0], slug || undefined)]);
  }

  if (slug && roles.includes('CLIENT')) {
    return router.createUrlTree([`/${slug}/client`]);
  }

  return router.createUrlTree(['/espace-selection']);
};
