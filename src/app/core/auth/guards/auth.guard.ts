import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Detect slugSalon in route params if present
  const slugSalon = route.paramMap.get('slugSalon') || route.parent?.paramMap.get('slugSalon');

  if (slugSalon) {
    return router.createUrlTree([`/${slugSalon}/auth/login`], {
      queryParams: { returnUrl: state.url }
    });
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};
