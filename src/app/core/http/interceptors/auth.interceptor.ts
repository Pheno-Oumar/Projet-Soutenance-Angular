import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { TokenService } from '../../auth/services/token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const token = tokenService.getToken();

  // Clone with withCredentials: true so that Spring Boot can read/write the refreshToken HttpOnly cookie
  let modifiedReq = req.clone({
    withCredentials: true
  });

  // Attach Authorization Bearer token if present
  if (token) {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(modifiedReq);
};
