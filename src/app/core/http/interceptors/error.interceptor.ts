import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { NotificationService } from '../../services/notification.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        // --- 401 UNAUTHORIZED ---
        if (error.status === 401) {
          const isAuthEndpoint =
            req.url.includes('/auth/login') ||
            req.url.includes('/auth/refresh-token') ||
            req.url.includes('/auth/logout');

          if (isAuthEndpoint) {
            if (req.url.includes('/auth/login')) {
              notificationService.error(
                error.error?.message || 'Identifiant ou mot de passe incorrect.',
                'Erreur de connexion'
              );
            }
            return throwError(() => error);
          }

          return handle401Error(req, next, authService);
        }

        // --- 403 FORBIDDEN ---
        if (error.status === 403) {
          notificationService.error(
            error.error?.message ||
              "Accès interdit : vous n'avez pas les droits nécessaires pour effectuer cette action.",
            'Accès Refusé'
          );
        }

        // --- 400 BAD REQUEST & VALIDATION ---
        else if (error.status === 400) {
          const errData = error.error?.data;
          if (errData && typeof errData === 'object' && !Array.isArray(errData)) {
            const fieldErrors = Object.entries(errData)
              .map(([field, msg]) => `• ${field}: ${msg}`)
              .join('\n');
            notificationService.error(fieldErrors, 'Erreur de validation des champs');
          } else {
            notificationService.error(
              error.error?.message || 'Données transmises non valides.',
              'Requête invalide'
            );
          }
        }

        // --- 404 NOT FOUND ---
        else if (error.status === 404) {
          if (error.error?.message) {
            notificationService.warning(error.error.message, 'Ressource introuvable');
          }
        }

        // --- 500 INTERNAL SERVER ERROR ---
        else if (error.status >= 500) {
          notificationService.error(
            'Une erreur interne est survenue sur le serveur. Veuillez réessayer ultérieurement.',
            'Erreur Serveur'
          );
        }

        // --- NETWORK / OFFLINE ---
        else if (error.status === 0) {
          notificationService.error(
            'Impossible de contacter le serveur distant. Vérifiez votre connexion Internet.',
            'Erreur Réseau'
          );
        }
      }

      return throwError(() => error);
    })
  );
};

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response) => {
        isRefreshing = false;
        if (response.success && response.data?.accessToken) {
          const newAccessToken = response.data.accessToken;
          refreshTokenSubject.next(newAccessToken);

          const retriedReq = request.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`
            }
          });
          return next(retriedReq);
        }

        authService.clearSession();
        authService.navigateToLogin();
        return throwError(() => new Error('Refresh token échoué'));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.clearSession();
        authService.navigateToLogin();
        return throwError(() => err);
      })
    );
  }

  // If already refreshing, wait for the new token and replay
  return refreshTokenSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) => {
      const retriedReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(retriedReq);
    })
  );
}
