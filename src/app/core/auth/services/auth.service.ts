import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/api-response.model';
import {
  LoginRequest,
  LoginResponse,
  TokenRefreshResponse,
  CompteSummary,
  SalonContext
} from '../models';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  private readonly baseUrl = environment.apiUrl;
  private readonly USER_KEY = 'hair_style_user';
  private readonly SALON_KEY = 'hair_style_salon_context';

  readonly currentUser = signal<CompteSummary | null>(this.getStoredUser());
  readonly currentSalonContext = signal<SalonContext | null>(this.getStoredSalonContext());
  readonly currentRoles = signal<string[]>(this.getInitialRoles());

  readonly isAuthenticated = computed(() => {
    const token = this.tokenService.token();
    return !!token && !this.tokenService.isTokenExpired();
  });

  private getStoredUser(): CompteSummary | null {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem(this.USER_KEY) || localStorage.getItem(this.USER_KEY);
      if (raw) {
        try {
          return JSON.parse(raw) as CompteSummary;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private getStoredSalonContext(): SalonContext | null {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem(this.SALON_KEY) || localStorage.getItem(this.SALON_KEY);
      if (raw) {
        try {
          return JSON.parse(raw) as SalonContext;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private getInitialRoles(): string[] {
    const salon = this.getStoredSalonContext();
    if (salon && salon.roles) {
      return salon.roles;
    }
    const user = this.getStoredUser();
    if (user && user.rolePlateforme) {
      return [user.rolePlateforme];
    }
    return [];
  }

  loginAdminSysteme(request: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/login`, request, {
        withCredentials: true
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.handleLoginSuccess(response.data);
          }
        })
      );
  }

  loginSalon(slugSalon: string, request: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.baseUrl}/${slugSalon}/auth/login`, request, {
        withCredentials: true
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.handleLoginSuccess(response.data, slugSalon);
          }
        })
      );
  }

  refreshToken(): Observable<ApiResponse<TokenRefreshResponse>> {
    return this.http
      .post<ApiResponse<TokenRefreshResponse>>(
        `${this.baseUrl}/auth/refresh-token`,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.tokenService.setToken(response.data.accessToken);
          }
        }),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        })
      );
  }

  logout(): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.clearSession();
          this.navigateToLogin();
        }),
        catchError((err) => {
          this.clearSession();
          this.navigateToLogin();
          return throwError(() => err);
        })
      );
  }

  private handleLoginSuccess(data: LoginResponse, explicitSlug?: string): void {
    this.tokenService.setToken(data.accessToken);
    this.currentUser.set(data.compte);
    this.saveUser(data.compte);

    const slug = data.slugSalon || explicitSlug;
    if (slug) {
      const roles = data.rolesSalon || [];
      const context: SalonContext = {
        slugSalon: slug,
        nomSalon: data.nomSalon,
        logoUrl: data.logoUrl,
        roles,
        actif: true
      };
      this.currentSalonContext.set(context);
      this.currentRoles.set(roles);
      this.saveSalonContext(context);
    } else if (data.compte.rolePlateforme) {
      const roles = [data.compte.rolePlateforme];
      this.currentRoles.set(roles);
      this.currentSalonContext.set(null);
      this.clearStoredSalonContext();
    }
  }

  setSalonContext(slugSalon: string, roles: string[], nomSalon?: string, actif = true, logoUrl?: string): void {
    const context: SalonContext = {
      slugSalon,
      nomSalon,
      logoUrl,
      roles,
      actif
    };
    this.currentSalonContext.set(context);
    this.currentRoles.set(roles);
    this.saveSalonContext(context);
  }

  updateCurrentUser(compte: CompteSummary): void {
    this.currentUser.set(compte);
    this.saveUser(compte);
  }

  clearSession(): void {
    this.tokenService.clearToken();
    this.currentUser.set(null);
    this.currentSalonContext.set(null);
    this.currentRoles.set([]);

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.USER_KEY);
      this.clearStoredSalonContext();
    }
  }

  private saveUser(user: CompteSummary): void {
    if (typeof window !== 'undefined') {
      const serialized = JSON.stringify(user);
      sessionStorage.setItem(this.USER_KEY, serialized);
      localStorage.setItem(this.USER_KEY, serialized);
    }
  }

  private saveSalonContext(context: SalonContext): void {
    if (typeof window !== 'undefined') {
      const serialized = JSON.stringify(context);
      sessionStorage.setItem(this.SALON_KEY, serialized);
      localStorage.setItem(this.SALON_KEY, serialized);
    }
  }

  private clearStoredSalonContext(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.SALON_KEY);
      localStorage.removeItem(this.SALON_KEY);
    }
  }

  navigateToLogin(returnUrl?: string): void {
    const currentSlug = this.currentSalonContext()?.slugSalon;
    if (currentSlug) {
      this.router.navigate([`/${currentSlug}/auth/login`], {
        queryParams: returnUrl ? { returnUrl } : undefined
      });
    } else {
      this.router.navigate(['/auth/login'], {
        queryParams: returnUrl ? { returnUrl } : undefined
      });
    }
  }
}
