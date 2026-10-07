import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';
import { NotificationService } from '../../services/notification.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const roleService = inject(RoleService);
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    const slugSalon = route.paramMap.get('slugSalon') || route.parent?.paramMap.get('slugSalon');
    const loginUrl = slugSalon ? `/${slugSalon}/auth/login` : '/auth/login';
    return router.createUrlTree([loginUrl], {
      queryParams: { returnUrl: state.url }
    });
  }

  const expectedRoles = (route.data?.['roles'] as string[]) || [];

  if (expectedRoles.length === 0) {
    return true;
  }

  const hasRequiredRole = roleService.hasAnyRole(expectedRoles);

  if (hasRequiredRole) {
    return true;
  }

  notificationService.error(
    "Accès non autorisé : vous n'avez pas les droits nécessaires pour accéder à cet espace.",
    'Accès Refusé'
  );

  // Redirect user to his valid default route or role selection
  const userRoles = roleService.getRoles();
  if (userRoles.length > 0) {
    const fallbackSlug = route.paramMap.get('slugSalon') || route.parent?.paramMap.get('slugSalon');
    const defaultRoute = roleService.getDefaultRouteForRole(userRoles[0], fallbackSlug || undefined);
    return router.createUrlTree([defaultRoute]);
  }

  return router.createUrlTree(['/espace-selection']);
};
