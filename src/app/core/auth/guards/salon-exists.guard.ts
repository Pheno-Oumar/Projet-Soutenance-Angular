import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ClientAuthService } from '../../../features/auth/services/client-auth.service';

export const salonExistsGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const clientAuthService = inject(ClientAuthService);
  const router = inject(Router);

  let slugSalon = route.paramMap.get('slugSalon');
  if (!slugSalon && route.parent) {
    slugSalon = route.parent.paramMap.get('slugSalon');
  }

  if (!slugSalon) {
    return router.createUrlTree(['/404']);
  }

  return clientAuthService.checkSalonExists(slugSalon).pipe(
    map((response) => {
      if (response && response.success && response.data && response.data.exists) {
        return true;
      }
      return router.createUrlTree(['/404']);
    }),
    catchError(() => {
      return of(router.createUrlTree(['/404']));
    })
  );
};
