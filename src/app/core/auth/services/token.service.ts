import { Injectable, signal, computed } from '@angular/core';
import { JwtPayload } from '../models/auth-response.model';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'hair_style_access_token';
  private readonly tokenSignal = signal<string | null>(this.getInitialToken());

  readonly token = computed(() => this.tokenSignal());

  private getInitialToken(): string | null {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  setToken(token: string, rememberMe = true): void {
    this.tokenSignal.set(token);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(this.TOKEN_KEY, token);
      if (rememberMe) {
        localStorage.setItem(this.TOKEN_KEY, token);
      }
    }
  }

  clearToken(): void {
    this.tokenSignal.set(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  getTokenPayload(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload) as JwtPayload;
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const payload = this.getTokenPayload();
    if (!payload || !payload.exp) {
      return true;
    }
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp < currentTimeInSeconds;
  }

  getTokenRemainingTime(): number {
    const payload = this.getTokenPayload();
    if (!payload || !payload.exp) {
      return 0;
    }
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - currentTimeInSeconds);
  }
}
